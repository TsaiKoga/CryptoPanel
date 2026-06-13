import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Asset } from '@/types';
import { fetchXStockMintMap } from '@/lib/solana-xstock';
import {
  fetchSolanaTokenMap,
  getMintsToQuery,
  resolveSolanaTokenSymbol,
} from '@/lib/solana-tokens';

const DEFAULT_SOLANA_RPC_URLS = [
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
] as const;

const MINT_QUERY_CONCURRENCY = 12;
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

let customSolanaRpcUrl: string | undefined;

export function setCustomSolanaRpcUrl(url: string | undefined): void {
  customSolanaRpcUrl = url?.trim() || undefined;
}

export function getDefaultSolanaRpcUrl(): string {
  return DEFAULT_SOLANA_RPC_URLS[0];
}

function resolveSolanaRpcUrls(rpcUrlOverride?: string): string[] {
  const custom = rpcUrlOverride?.trim() || customSolanaRpcUrl || process.env.SOLANA_RPC_URL?.trim();
  // User-configured RPC: use exclusively (no public fallback)
  if (custom) return [custom];
  return [...DEFAULT_SOLANA_RPC_URLS];
}

async function withSolanaConnection<T>(
  fn: (connection: Connection) => Promise<T>,
  commitment: Parameters<typeof Connection>[1] = 'confirmed',
  rpcUrlOverride?: string
): Promise<T> {
  let lastErr: unknown;
  for (const url of resolveSolanaRpcUrls(rpcUrlOverride)) {
    try {
      const connection = new Connection(url, { commitment, disableRetryOnRateLimit: true });
      return await fn(connection);
    } catch (e) {
      lastErr = e;
      console.warn(`[Solana] RPC failed (${url}):`, e instanceof Error ? e.message : e);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Token-2022 xStock 等可能 uiAmount 为 null，需回退 uiAmountString / raw amount。 */
function parseTokenUiAmount(tokenAmount: Record<string, unknown> | undefined): number {
  if (!tokenAmount) return 0;

  const uiAmount = tokenAmount.uiAmount;
  if (typeof uiAmount === 'number' && uiAmount > 0) return uiAmount;

  const uiAmountString = tokenAmount.uiAmountString;
  if (uiAmountString != null && uiAmountString !== '') {
    const parsed = parseFloat(String(uiAmountString));
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  const amount = tokenAmount.amount;
  const decimals = tokenAmount.decimals;
  if (amount != null && decimals != null) {
    const raw = BigInt(String(amount));
    const dec = Number(decimals);
    if (dec >= 0) {
      const n = Number(raw) / 10 ** dec;
      if (n > 0) return n;
    }
  }

  return 0;
}

/**
 * 公共 RPC 会拦截 getParsedTokenAccountsByOwner 的 programId 参数（403 blocked parameter）。
 * 改为按 mint 逐个查询（params.mint），可正常返回 SPL / Token-2022 余额。
 */
async function fetchTokensByMintList(
  connection: Connection,
  owner: PublicKey,
  mints: string[]
): Promise<Array<{ mint: string; amount: number }>> {
  const holdings: Array<{ mint: string; amount: number }> = [];

  for (let i = 0; i < mints.length; i += MINT_QUERY_CONCURRENCY) {
    const batch = mints.slice(i, i + MINT_QUERY_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (mint) => {
        try {
          const resp = await connection.getParsedTokenAccountsByOwner(owner, {
            mint: new PublicKey(mint),
          });

          let amount = 0;
          for (const { account } of resp.value) {
            const parsed = (account.data as { parsed?: { info?: Record<string, unknown> } })
              ?.parsed;
            const tokenAmount = parsed?.info?.tokenAmount as
              | Record<string, unknown>
              | undefined;
            amount += parseTokenUiAmount(tokenAmount);
          }

          return amount > 0 ? { mint, amount } : null;
        } catch {
          return null;
        }
      })
    );

    for (const row of batchResults) {
      if (row) holdings.push(row);
    }
  }

  return holdings;
}

function isProgramScanBlockedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('403') ||
    msg.includes('blocked') ||
    msg.includes('-32600') ||
    msg.includes('Invalid param') ||
    msg.includes('not allowed')
  );
}

/** 自定义 RPC 等通常支持 programId 扫描，可发现钱包内任意 SPL 余额 */
async function fetchTokensByProgramScan(
  connection: Connection,
  owner: PublicKey
): Promise<Array<{ mint: string; amount: number }> | null> {
  const byMint = new Map<string, number>();

  try {
    for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
      const resp = await connection.getParsedTokenAccountsByOwner(owner, {
        programId: new PublicKey(programId),
      });

      for (const { account } of resp.value) {
        const parsed = (account.data as { parsed?: { info?: Record<string, unknown> } })?.parsed;
        const info = parsed?.info;
        const mint = typeof info?.mint === 'string' ? info.mint : '';
        if (!mint || mint === WSOL_MINT) continue;

        const amount = parseTokenUiAmount(info?.tokenAmount as Record<string, unknown> | undefined);
        if (amount <= 0) continue;

        byMint.set(mint, (byMint.get(mint) ?? 0) + amount);
      }
    }

    return Array.from(byMint.entries()).map(([mint, amount]) => ({ mint, amount }));
  } catch (e) {
    if (isProgramScanBlockedError(e)) {
      console.log('[Solana] programId scan not supported on this RPC, using mint list');
      return null;
    }
    throw e;
  }
}

async function fetchWalletTokenHoldings(
  connection: Connection,
  owner: PublicKey,
  mintsToQuery: string[]
): Promise<Array<{ mint: string; amount: number }>> {
  const scanned = await fetchTokensByProgramScan(connection, owner);
  if (scanned !== null) {
    console.log(`[Solana] programId scan found ${scanned.length} token balances`);
    return scanned;
  }
  return fetchTokensByMintList(connection, owner, mintsToQuery);
}

function isLikelySolanaAddress(addr: string): boolean {
  return addr.length >= 32 && addr.length <= 44 && !addr.startsWith('0x');
}

export function validateSolanaAddress(addr: string): boolean {
  const normalized = addr.trim();
  if (!isLikelySolanaAddress(normalized)) return false;
  try {
    new PublicKey(normalized);
    return true;
  } catch {
    return false;
  }
}

export async function fetchSolanaAssetsCore(
  address: string,
  walletName?: string,
  rpcUrlOverride?: string
): Promise<Asset[]> {
  const normalizedAddress = address.trim();
  if (!isLikelySolanaAddress(normalizedAddress)) return [];

  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(normalizedAddress);
  } catch {
    return [];
  }

  const assets: Asset[] = [];
  const sourceLabel = walletName ? `${walletName} (Solana)` : 'Wallet (Solana)';

  try {
    const lamports = await withSolanaConnection(
      (connection) => connection.getBalance(pubkey),
      'confirmed',
      rpcUrlOverride
    );
    const sol = lamports / LAMPORTS_PER_SOL;
    if (sol > 0) {
      assets.push({
        symbol: 'SOL',
        amount: sol,
        valueUsd: 0,
        price: 0,
        source: sourceLabel,
        type: 'wallet',
        chainName: 'solana',
        contractAddress: WSOL_MINT,
      });
    }
  } catch (e) {
    console.warn('[Solana] Failed to fetch SOL balance:', e);
  }

  try {
    const [xStockMints, tokenMap] = await Promise.all([
      fetchXStockMintMap(),
      fetchSolanaTokenMap(),
    ]);

    const mintsToQuery = getMintsToQuery(tokenMap, xStockMints);
    console.log(`[Solana] Querying ${mintsToQuery.length} mints (mint-filter, no programId scan)`);

    const holdings = await withSolanaConnection(
      (connection) => fetchWalletTokenHoldings(connection, pubkey, mintsToQuery),
      'confirmed',
      rpcUrlOverride
    );

    console.log(`[Solana] Found ${holdings.length} token balances for ${normalizedAddress}`);

    for (const { mint, amount } of holdings) {
      const symbol = resolveSolanaTokenSymbol(mint, tokenMap, xStockMints);

      assets.push({
        symbol,
        amount,
        valueUsd: 0,
        price: 0,
        source: sourceLabel,
        type: 'wallet',
        chainName: 'solana',
        contractAddress: mint,
      });
    }
  } catch (e) {
    console.warn('[Solana] Failed to fetch token accounts:', e);
  }

  return assets;
}
