/** Solana SPL mint → symbol（Jupiter 列表 + 常用代币兜底） */

import { XSTOCK_KNOWN_MINTS } from '@/lib/solana-xstock';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';
/** 公共 RPC 禁止 programId 全扫，按 mint 查询时的上限 */
const MAX_MINTS_TO_QUERY = 350;

const JUPITER_TOKEN_URLS = [
  'https://token.jup.ag/strict',
  'https://cache.jup.ag/tokens',
  'https://tokens.jup.ag/tokens?tags=verified',
] as const;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

/** 常用 Solana 代币（Jupiter 不可用时兜底） */
export const KNOWN_SOLANA_TOKENS: Record<string, string> = {
  // Stablecoins
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM': 'USDCet',
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': 'stSOL',
  // SOL / LST
  'So11111111111111111111111111111111111111112': 'WSOL',
  'J1toso1uCk3RLmjorhuawjQrKTMWvNqF2y9dY5oT8Y4': 'JitoSOL',
  'mSoLzYCxHxbf6u6k3FA3YfKcR8YmYp4P3n4e1Q6aU': 'mSOL',
  'bSo13r4TkiE4KumL5LsMHTMWkGwtjrJrbo7YWDRs1': 'bSOL',
  // DeFi / infra
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': 'JTO',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'RAY',
  'HZ1JovNiVvGrGNiiYvEozM7gS8v7C9fH4aVwW5EYFM': 'PYTH',
  'JUPyiwrYJFskUPaHaMq29N9u2b9k3Up8Yj4oJTdvj5': 'JUP',
  // Meme / community
  'H7JvMvHU5KkCMN1bABMDTUNbBr98iVYDHbpPoZMnpump': 'DOG',
  // Seeker (SKR)
  'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3': 'SKR',
  // Seeker Genesis Token (NFT-like, Token-2022)
  'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te': 'SGT',
};

let cache: { map: Record<string, string>; expiresAt: number } | null = null;

async function fetchJupiterTokenMap(): Promise<Record<string, string>> {
  for (const url of JUPITER_TOKEN_URLS) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as Array<{ address: string; symbol: string }>;
      if (!Array.isArray(data) || data.length === 0) continue;

      const map: Record<string, string> = {};
      for (const token of data) {
        if (token.address && token.symbol) {
          map[token.address] = token.symbol;
        }
      }
      console.log(`[Solana/tokens] Loaded ${Object.keys(map).length} tokens from ${url}`);
      return map;
    } catch (e) {
      console.warn(`[Solana/tokens] Jupiter fetch failed (${url}):`, e);
    }
  }
  return {};
}

export async function fetchSolanaTokenMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return { ...KNOWN_SOLANA_TOKENS, ...cache.map };
  }

  const jupiterMap = await fetchJupiterTokenMap();
  const merged = { ...KNOWN_SOLANA_TOKENS, ...jupiterMap };

  cache = { map: merged, expiresAt: now + CACHE_TTL_MS };
  return merged;
}

export function resolveSolanaTokenSymbol(
  mint: string,
  tokenMap: Record<string, string>,
  xStockMap: Record<string, string>
): string {
  return (
    xStockMap[mint] ??
    tokenMap[mint] ??
    `SPL-${mint.slice(0, 4)}…${mint.slice(-4)}`
  );
}

/** 优先查询常用 / xStock mint（公共 RPC 不支持按 programId 扫描全钱包） */
export function getMintsToQuery(
  tokenMap: Record<string, string>,
  xStockMap: Record<string, string>
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const add = (mint: string) => {
    if (!mint || mint === WSOL_MINT || seen.has(mint)) return;
    seen.add(mint);
    ordered.push(mint);
  };

  for (const mint of Object.keys(KNOWN_SOLANA_TOKENS)) add(mint);
  for (const mint of Object.keys(XSTOCK_KNOWN_MINTS)) add(mint);
  for (const mint of Object.keys(xStockMap)) add(mint);
  for (const mint of Object.keys(tokenMap)) {
    if (ordered.length >= MAX_MINTS_TO_QUERY) break;
    add(mint);
  }

  return ordered;
}
