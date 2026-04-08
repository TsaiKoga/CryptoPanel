import { Asset } from '@/types';

export function aggregateAssetsBySymbol(
  list: Asset[],
  aggregatedSourceLabel: string
): Asset[] {
  const map = new Map<string, { asset: Asset; sources: Set<string> }>();

  for (const a of list) {
    const key = a.symbol.split(' ')[0].trim().toUpperCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        asset: {
          ...a,
          symbol: key,
          // Aggregated rows do not represent a single chain/contract.
          chainId: undefined,
          chainName: undefined,
          contractAddress: undefined,
        },
        sources: new Set([a.source]),
      });
      continue;
    }

    existing.asset.amount += a.amount;
    existing.asset.valueUsd += a.valueUsd;
    existing.sources.add(a.source);
    if (a.loadFailed) existing.asset.loadFailed = true;
  }

  const aggregated = Array.from(map.values()).map(({ asset, sources }) => {
    const amount = asset.amount;
    const valueUsd = asset.valueUsd;
    const price = amount > 0 ? valueUsd / amount : 0;
    return {
      ...asset,
      price,
      source: `${aggregatedSourceLabel} (${sources.size})`,
    };
  });

  aggregated.sort((a, b) => b.valueUsd - a.valueUsd);
  return aggregated;
}

