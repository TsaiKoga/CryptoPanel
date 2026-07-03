import { Asset } from '@/types';
import {
  PortfolioHolding,
  PortfolioRiskFlag,
  PortfolioSnapshot,
} from '@/types';

const STABLECOIN_SYMBOLS = new Set([
  'USDT', 'USDC', 'USDE', 'DAI', 'BUSD', 'FDUSD', 'TUSD', 'USDD', 'FRAX', 'LUSD',
]);

const BTC_ETH_SYMBOLS = new Set([
  'BTC', 'WBTC', 'ETH', 'WETH', 'STETH', 'WSTETH', 'CBETH', 'RETH',
]);

function isStablecoin(symbol: string): boolean {
  return STABLECOIN_SYMBOLS.has(symbol.toUpperCase());
}

function isBtcOrEth(symbol: string): boolean {
  return BTC_ETH_SYMBOLS.has(symbol.toUpperCase());
}

function venueForAsset(asset: Asset): 'cex' | 'onchain' {
  return asset.type === 'cex' ? 'cex' : 'onchain';
}

function mergeVenue(
  current: 'cex' | 'onchain' | 'mixed' | undefined,
  next: 'cex' | 'onchain'
): 'cex' | 'onchain' | 'mixed' {
  if (!current) return next;
  if (current === next) return current;
  return 'mixed';
}

export function buildPortfolioSnapshot(assets: Asset[]): PortfolioSnapshot {
  const valued = assets.filter((a) => a.valueUsd > 0);
  const totalUsd = valued.reduce((sum, a) => sum + a.valueUsd, 0);

  const bySymbol = new Map<string, { valueUsd: number; venue: 'cex' | 'onchain' | 'mixed' }>();
  for (const asset of valued) {
    const symbol = asset.symbol.split(' ')[0].trim().toUpperCase();
    const existing = bySymbol.get(symbol);
    if (!existing) {
      bySymbol.set(symbol, { valueUsd: asset.valueUsd, venue: venueForAsset(asset) });
    } else {
      existing.valueUsd += asset.valueUsd;
      existing.venue = mergeVenue(existing.venue, venueForAsset(asset));
    }
  }

  const holdings: PortfolioHolding[] = Array.from(bySymbol.entries())
    .map(([symbol, { valueUsd, venue }]) => ({
      symbol,
      valueUsd,
      pct: totalUsd > 0 ? (valueUsd / totalUsd) * 100 : 0,
      venue,
    }))
    .sort((a, b) => b.valueUsd - a.valueUsd);

  const top1Pct = holdings[0]?.pct ?? 0;
  const top3Pct = holdings.slice(0, 3).reduce((sum, h) => sum + h.pct, 0);
  const hhi = holdings.reduce((sum, h) => sum + (h.pct / 100) ** 2, 0) * 100;

  let cexUsd = 0;
  let onchainUsd = 0;
  for (const asset of valued) {
    if (asset.type === 'cex') cexUsd += asset.valueUsd;
    else onchainUsd += asset.valueUsd;
  }

  const stablecoinUsd = holdings
    .filter((h) => isStablecoin(h.symbol))
    .reduce((sum, h) => sum + h.valueUsd, 0);
  const btcEthUsd = holdings
    .filter((h) => isBtcOrEth(h.symbol))
    .reduce((sum, h) => sum + h.valueUsd, 0);

  const loadFailedCount = assets.filter((a) => a.loadFailed).length;
  const zeroPriceCount = assets.filter((a) => a.amount > 0 && a.price === 0).length;

  const flags: PortfolioRiskFlag[] = [];
  if (top1Pct > 50) flags.push('high_single_asset_concentration');
  if (top3Pct > 75) flags.push('high_top3_concentration');
  if (totalUsd > 0 && (cexUsd / totalUsd) * 100 > 70) flags.push('high_cex_custody');
  if (totalUsd > 1000 && (stablecoinUsd / totalUsd) * 100 < 5) flags.push('low_stablecoin_buffer');
  if (zeroPriceCount > 0) flags.push('partial_price_missing');
  if (loadFailedCount > 0) flags.push('load_failed');

  const healthScore = computeHealthScore({
    top1Pct,
    top3Pct,
    cexPct: totalUsd > 0 ? (cexUsd / totalUsd) * 100 : 0,
    stablecoinPct: totalUsd > 0 ? (stablecoinUsd / totalUsd) * 100 : 0,
    loadFailedCount,
    zeroPriceCount,
    assetCount: holdings.length,
  });

  return {
    totalUsd,
    assetCount: holdings.length,
    holdings: holdings.slice(0, 10),
    concentration: { top1Pct, top3Pct, hhi },
    venueSplit: {
      cexUsd,
      onchainUsd,
      cexPct: totalUsd > 0 ? (cexUsd / totalUsd) * 100 : 0,
      onchainPct: totalUsd > 0 ? (onchainUsd / totalUsd) * 100 : 0,
    },
    stablecoinPct: totalUsd > 0 ? (stablecoinUsd / totalUsd) * 100 : 0,
    btcEthPct: totalUsd > 0 ? (btcEthUsd / totalUsd) * 100 : 0,
    healthScore,
    flags,
    dataQuality: { loadFailedCount, zeroPriceCount },
  };
}

function computeHealthScore(input: {
  top1Pct: number;
  top3Pct: number;
  cexPct: number;
  stablecoinPct: number;
  loadFailedCount: number;
  zeroPriceCount: number;
  assetCount: number;
}): number {
  let score = 100;

  if (input.top1Pct > 70) score -= 25;
  else if (input.top1Pct > 50) score -= 15;
  else if (input.top1Pct > 35) score -= 8;

  if (input.top3Pct > 85) score -= 15;
  else if (input.top3Pct > 75) score -= 10;

  if (input.cexPct > 90) score -= 12;
  else if (input.cexPct > 70) score -= 6;

  if (input.stablecoinPct >= 5 && input.stablecoinPct <= 25) score += 5;
  if (input.stablecoinPct > 60) score -= 8;

  if (input.assetCount < 3 && input.top1Pct > 0) score -= 5;

  score -= Math.min(15, input.loadFailedCount * 5 + input.zeroPriceCount * 3);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function snapshotFingerprint(snapshot: PortfolioSnapshot): string {
  const parts = snapshot.holdings
    .slice(0, 5)
    .map((h) => `${h.symbol}:${h.pct.toFixed(1)}`);
  return `${snapshot.totalUsd.toFixed(0)}|${parts.join(',')}`;
}

/** Include market sentiment bucket so analysis refreshes when regime shifts. */
export function analysisFingerprint(
  snapshot: PortfolioSnapshot,
  fearGreedValue?: number | null
): string {
  const base = snapshotFingerprint(snapshot);
  if (fearGreedValue == null || Number.isNaN(fearGreedValue)) return base;
  const bucket = Math.floor(fearGreedValue / 15);
  return `${base}|fng:${bucket}`;
}
