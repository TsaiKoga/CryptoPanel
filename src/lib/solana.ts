import { Asset } from '@/types';
import { isChromeExtension } from './storage';
import { fetchSolanaAssetsCore } from './solana-core';

export { validateSolanaAddress } from './solana-core';

export async function fetchSolanaAssets(
  address: string,
  walletName?: string,
  customRpcUrl?: string
): Promise<Asset[]> {
  if (isChromeExtension) {
    return fetchSolanaAssetsCore(address, walletName, customRpcUrl);
  }

  const res = await fetch('/api/solana/balance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, walletName, rpcUrl: customRpcUrl }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `Failed to fetch Solana balance (${res.status})`);
  }

  const data = (await res.json()) as { assets: Asset[] };
  return data.assets ?? [];
}
