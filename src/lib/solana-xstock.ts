/** xStock (Backed Finance) Solana mint → symbol map. */

const BACKED_ASSETS_URL = 'https://api.backed.fi/api/v2/public/assets';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** 常用 xStock（Backed API 分页未必包含） */
export const XSTOCK_KNOWN_MINTS: Record<string, string> = {
  XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB: 'TSLAx',
  XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1: 'CRCLx',
  XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp: 'AAPLx',
  Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ: 'QQQx',
  XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W: 'SPYx',
};

let cache: { map: Record<string, string>; expiresAt: number } | null = null;

export async function fetchXStockMintMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return { ...XSTOCK_KNOWN_MINTS, ...cache.map };
  }

  const map: Record<string, string> = { ...XSTOCK_KNOWN_MINTS };

  try {
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const url = new URL(BACKED_ASSETS_URL);
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('after', cursor);

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) break;

      const data = (await res.json()) as {
        nodes?: Array<{
          symbol: string;
          deployments?: Array<{ network?: string; address?: string }>;
        }>;
        pageInfo?: { hasNextPage?: boolean; endCursor?: string };
      };

      for (const node of data.nodes ?? []) {
        for (const dep of node.deployments ?? []) {
          if (dep.network?.toLowerCase() === 'solana' && dep.address) {
            map[dep.address] = node.symbol;
          }
        }
      }

      if (!data.pageInfo?.hasNextPage || !data.pageInfo.endCursor) break;
      cursor = data.pageInfo.endCursor;
    }

    cache = { map, expiresAt: now + CACHE_TTL_MS };
    return map;
  } catch (e) {
    console.warn('[Solana/xStock] Failed to load mint map:', e);
    return map;
  }
}
