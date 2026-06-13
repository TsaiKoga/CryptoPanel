import { Asset } from '@/types';

/** Base ticker for CEX rows like `BTC (简单赚币)`. */
export function assetBaseSymbol(symbol: string): string {
  return symbol.split(' ')[0].trim().toUpperCase();
}

/**
 * Whether an asset should appear when "hide small assets" is enabled.
 * - Known USD value below threshold → hide
 * - Wallet balances with unknown price → keep (avoid hiding mainnet ETH etc.)
 * - CEX balances with unknown price → hide (treat as $0 dust)
 */
export function shouldDisplayAsset(
  asset: Asset,
  hideSmallAssets: boolean,
  threshold: number
): boolean {
  if (!hideSmallAssets) return true;
  if (asset.loadFailed) return true;

  const amount = Number(asset.amount);
  if (!Number.isFinite(amount) || amount <= 0) return false;

  const price = Number(asset.price);
  const valueUsd = Number(asset.valueUsd);

  if (Number.isFinite(price) && price > 0 && Number.isFinite(valueUsd)) {
    return valueUsd >= threshold;
  }

  if (asset.type === 'wallet') return true;

  const effectiveValue = Number.isFinite(valueUsd) ? valueUsd : 0;
  return effectiveValue >= threshold;
}
