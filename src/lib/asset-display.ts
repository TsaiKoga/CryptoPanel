import { Asset, Language } from '@/types';

/** Longer zh labels first so「资金账号」won't be partially replaced by「资金」. */
const CEX_PRODUCT_LABELS: Array<{ zh: string; en: string }> = [
  { zh: '灵活赚币', en: 'Flexible Earn' },
  { zh: '锁定赚币', en: 'Locked Earn' },
  { zh: '简单赚币', en: 'Simple Earn' },
  { zh: '链上赚币', en: 'On-chain Earn' },
  { zh: '资金账号', en: 'Funding Account' },
  { zh: '交易账号', en: 'Trading Account' },
  { zh: '现货', en: 'Spot' },
  { zh: '资金', en: 'Funding' },
  { zh: '交易', en: 'Trading' },
];

/** Localize CEX earn/account suffixes baked into symbol/source (storage may stay zh). */
export function localizeCexLabelText(text: string, language: Language): string {
  if (!text) return text;
  let result = text;
  for (const { zh, en } of CEX_PRODUCT_LABELS) {
    if (language === 'en') {
      result = result.split(zh).join(en);
    } else {
      result = result.split(en).join(zh);
    }
  }
  return result;
}

/** Base ticker for CEX rows like `BTC (简单赚币)` / `BTC (Simple Earn)`. */
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
