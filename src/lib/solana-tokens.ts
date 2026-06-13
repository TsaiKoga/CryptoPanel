/** Solana SPL mint → symbol（Jupiter / CDN 列表 + 常用代币兜底） */

import { XSTOCK_KNOWN_MINTS } from '@/lib/solana-xstock';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';
/** 公共 RPC 禁止 programId 全扫，按 mint 查询时的上限 */
const MAX_MINTS_TO_QUERY = 350;

const FETCH_TIMEOUT_MS = 8_000;

/** Jupiter（部分地区/服务端易超时，失败时走 CDN 兜底） */
const JUPITER_TOKEN_URLS = [
  'https://token.jup.ag/strict',
  'https://cache.jup.ag/tokens',
] as const;

/** 不依赖 jup.ag 的代币列表（jsDelivr / CoinGecko） */
const CDN_TOKEN_LIST_URLS = [
  {
    url: 'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json',
    kind: 'solana-labs' as const,
  },
  {
    url: 'https://tokens.coingecko.com/solana/all.json',
    kind: 'coingecko' as const,
  },
] as const;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const FAILED_FETCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5m — avoid hammering dead endpoints

/** 常用 Solana 代币（所有远程列表不可用时兜底） */
export const KNOWN_SOLANA_TOKENS: Record<string, string> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM': 'USDCet',
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': 'stSOL',
  'So11111111111111111111111111111111111111112': 'WSOL',
  'J1toso1uCk3RLmjorhuawjQrKTMWvNqF2y9dY5oT8Y4': 'JitoSOL',
  'mSoLzYCxHxbf6u6k3FA3YfKcR8YmYp4P3n4e1Q6aU': 'mSOL',
  'bSo13r4TkiE4KumL5LsMHTMWkGwtjrJrbo7YWDRs1': 'bSOL',
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': 'JTO',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'RAY',
  'HZ1JovNiVvGrGNiiYvEozM7gS8v7C9fH4aVwW5EYFM': 'PYTH',
  'JUPyiwrYJFskUPaHaMq29N9u2b9k3Up8Yj4oJTdvj5': 'JUP',
  'H7JvMvHU5KkCMN1bABMDTUNbBr98iVYDHbpPoZMnpump': 'DOG',
  'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3': 'SKR',
  'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te': 'SGT',
};

let cache: { map: Record<string, string>; expiresAt: number } | null = null;

function mergeTokenRows(
  target: Record<string, string>,
  rows: Array<{ address?: string; symbol?: string }>
): number {
  let added = 0;
  for (const token of rows) {
    const address = token.address?.trim();
    const symbol = token.symbol?.trim();
    if (!address || !symbol) continue;
    if (!target[address]) added++;
    target[address] = symbol;
  }
  return added;
}

function parseJupiterPayload(data: unknown): Record<string, string> {
  if (!Array.isArray(data)) return {};
  const map: Record<string, string> = {};
  mergeTokenRows(map, data as Array<{ address: string; symbol: string }>);
  return map;
}

function parseCdnPayload(
  data: unknown,
  kind: (typeof CDN_TOKEN_LIST_URLS)[number]['kind']
): Record<string, string> {
  const map: Record<string, string> = {};

  if (kind === 'solana-labs') {
    const tokens = (data as { tokens?: Array<{ address: string; symbol: string }> })?.tokens;
    if (Array.isArray(tokens)) mergeTokenRows(map, tokens);
    return map;
  }

  const tokens = (data as { tokens?: Array<{ address: string; symbol: string }> })?.tokens;
  if (Array.isArray(tokens)) mergeTokenRows(map, tokens);
  return map;
}

async function fetchJsonWithTimeout(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchRemoteTokenMap(): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};
  const failures: string[] = [];

  for (const url of JUPITER_TOKEN_URLS) {
    const data = await fetchJsonWithTimeout(url);
    if (!data) {
      failures.push(`jupiter:${url}`);
      continue;
    }
    const map = parseJupiterPayload(data);
    if (Object.keys(map).length === 0) {
      failures.push(`jupiter-empty:${url}`);
      continue;
    }
    Object.assign(merged, map);
    console.log(`[Solana/tokens] Loaded ${Object.keys(map).length} tokens from ${url}`);
    return merged;
  }

  for (const { url, kind } of CDN_TOKEN_LIST_URLS) {
    const data = await fetchJsonWithTimeout(url);
    if (!data) {
      failures.push(`cdn:${url}`);
      continue;
    }
    const map = parseCdnPayload(data, kind);
    if (Object.keys(map).length === 0) {
      failures.push(`cdn-empty:${url}`);
      continue;
    }
    Object.assign(merged, map);
    console.log(`[Solana/tokens] Loaded ${Object.keys(map).length} tokens from ${url}`);
    return merged;
  }

  if (failures.length > 0) {
    console.warn(
      `[Solana/tokens] Remote token lists unavailable (${failures.length} attempts); using built-in symbols only`
    );
  }
  return merged;
}

export async function fetchSolanaTokenMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return { ...KNOWN_SOLANA_TOKENS, ...cache.map };
  }

  const remoteMap = await fetchRemoteTokenMap();
  const hasRemote = Object.keys(remoteMap).length > 0;
  const merged = { ...KNOWN_SOLANA_TOKENS, ...remoteMap };

  cache = {
    map: remoteMap,
    expiresAt: now + (hasRemote ? CACHE_TTL_MS : FAILED_FETCH_CACHE_TTL_MS),
  };
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
