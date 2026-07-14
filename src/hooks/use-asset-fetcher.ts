"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAssetStore } from '@/components/providers/asset-provider';
import { Asset } from '@/types';
import { fetchOnChainAssets } from '@/lib/onchain';
import { fetchEigenLayerAssets } from '@/lib/protocols/eigenlayer';
import { fetchAerodromeAssets } from '@/lib/protocols/aerodrome';
import { fetchAaveAssets } from '@/lib/protocols/aave';
import { fetchStargateAssets } from '@/lib/protocols/stargate';
import { assetCache } from '@/lib/storage';
import { toast } from 'sonner';
import { fetchSolanaAssets } from '@/lib/solana';
import { useI18n } from './use-i18n';
import { fetchHyperliquidAssets } from '@/lib/hyperliquid';
import { formatOkxDisplaySource } from '@/lib/okx';
import { assetBaseSymbol, shouldDisplayAsset } from '@/lib/asset-display';
import { applyRpcSettings, getRpcSettingsFingerprint } from '@/lib/apply-rpc-settings';

function resolveWalletType(wallet: { type?: 'evm' | 'sol'; address: string }): 'evm' | 'sol' {
  if (wallet.type) return wallet.type;
  if (wallet.address.startsWith('0x')) return 'evm';
  return 'sol';
}

function filterAndSortAssets(
  list: Asset[],
  hideSmallAssets: boolean,
  smallAssetsThreshold: number
): Asset[] {
  const filtered = list.filter((a) =>
    shouldDisplayAsset(a, hideSmallAssets, smallAssetsThreshold)
  );
  filtered.sort((a, b) => b.valueUsd - a.valueUsd);
  return filtered;
}

async function applyMissingPrices(assets: Asset[]): Promise<void> {
  const assetsToPrice = assets.filter((a) => a.price === 0);
  if (assetsToPrice.length === 0) return;

  try {
    const { fetchPrices } = await import('@/lib/api');
    const { prices } = await fetchPrices(assetsToPrice);

    assets.forEach((asset) => {
      if (asset.price !== 0) return;

      const base = assetBaseSymbol(asset.symbol);
      const price =
        prices[asset.symbol] ?? prices[base] ?? prices[base.toUpperCase()];

      if (price && price > 0) {
        asset.price = price;
        asset.valueUsd = asset.amount * price;
        if (base !== asset.symbol) {
          console.log(
            `[AssetFetcher] Updated price for ${asset.symbol} using base symbol ${base}: $${price}`
          );
        }
      }
    });
  } catch (e) {
    console.error('Failed to fetch prices for assets', e);
  }
}

export function useAssetFetcher() {
  const { exchanges, wallets, isLoaded, settings } = useAssetStore();
  const { t } = useI18n();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingByAccount, setLoadingByAccount] = useState<Record<string, boolean>>({});
  const [accountAssets, setAccountAssets] = useState<Record<string, Asset[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const rpcFingerprintRef = useRef<string | null>(null);
  const fetchGenRef = useRef(0);

  const fetchAssets = useCallback(async (forceRefresh = false) => {
    if (!isLoaded) return;

    applyRpcSettings(settings);

    if (!forceRefresh && isInitialLoad) {
      const cachedAssets = await assetCache.get();
      if (cachedAssets && cachedAssets.length > 0) {
        console.log('[AssetFetcher] Using cached assets:', cachedAssets.length);
        setAssets(
          filterAndSortAssets(
            cachedAssets,
            settings.hideSmallAssets,
            settings.smallAssetsThreshold
          )
        );
        setIsInitialLoad(false);
        return;
      }
    }

    const gen = ++fetchGenRef.current;
    const accountNames = [
      ...exchanges.map((e) => e.name),
      ...wallets.map((w) => w.name),
    ];

    setLoading(true);
    setError(null);
    setAccountAssets({});
    setLoadingByAccount(
      Object.fromEntries(accountNames.map((name) => [name, true]))
    );

    const collectedByAccount = new Map<string, Asset[]>();

    const settleAccount = async (accountName: string, rawList: Asset[]) => {
      if (fetchGenRef.current !== gen) return;

      await applyMissingPrices(rawList);
      if (fetchGenRef.current !== gen) return;

      collectedByAccount.set(accountName, rawList);

      const filtered = filterAndSortAssets(
        rawList,
        settings.hideSmallAssets,
        settings.smallAssetsThreshold
      );

      setAccountAssets((prev) => ({ ...prev, [accountName]: filtered }));
      setLoadingByAccount((prev) => ({ ...prev, [accountName]: false }));
    };

    try {
      const cexPromises = exchanges.map(async (exchange) => {
        let list: Asset[] = [];
        try {
          const { fetchExchangeBalance } = await import('@/lib/api');
          const data = (await fetchExchangeBalance(exchange)) as {
            assets?: Asset[];
            error?: string;
          };

          if (data.error) throw new Error(data.error);

          if (data.assets) {
            list = data.assets.map((a: Asset) => ({
              ...a,
              source: formatOkxDisplaySource(exchange.name, a.source),
            }));
          }
        } catch (e: any) {
          console.error(`Failed to fetch ${exchange.name}`, e);

          const errorMessage = e.message || String(e);
          if (
            errorMessage.includes('50105') ||
            errorMessage.includes('Passphrase incorrect') ||
            errorMessage.includes('OK-ACCESS-PASSPHRASE')
          ) {
            toast.error(t('errors.okxPassphraseError'), {
              description: t('errors.okxPassphraseErrorDesc'),
              duration: 8000,
            });
          } else {
            toast.error(`CEX Sync Error (${exchange.name})`, {
              description: e.message,
            });
          }
        }
        await settleAccount(exchange.name, list);
      });

      const walletPromises = wallets.map(async (wallet) => {
        let list: Asset[] = [];
        try {
          const walletType = resolveWalletType(wallet);
          console.log(
            `[AssetFetcher] Fetching assets for wallet ${wallet.name} (${wallet.address}) type=${walletType}`
          );

          if (walletType === 'sol') {
            const solAssets = await fetchSolanaAssets(
              wallet.address,
              wallet.name,
              settings.customSolanaRpcUrl
            );
            list = solAssets.map((a) => ({
              ...a,
              source: `${wallet.name} (Solana)`,
            }));
          } else {
            const [
              onChainAssets,
              eigenAssets,
              aerodromeAssets,
              aaveAssets,
              stargateAssets,
              hyperliquidAssets,
            ] = await Promise.all([
              fetchOnChainAssets(wallet.address),
              fetchEigenLayerAssets(wallet.address).catch((e) => {
                console.error(
                  `[AssetFetcher] EigenLayer fetch failed for ${wallet.address}:`,
                  e
                );
                return [];
              }),
              fetchAerodromeAssets(wallet.address),
              fetchAaveAssets(wallet.address),
              fetchStargateAssets(wallet.address).catch((e) => {
                console.error(
                  `[AssetFetcher] Stargate fetch failed for ${wallet.address}:`,
                  e
                );
                return [];
              }),
              fetchHyperliquidAssets(wallet.address, wallet.name).catch((e) => {
                console.error(
                  `[AssetFetcher] Hyperliquid fetch failed for ${wallet.address}:`,
                  e
                );
                return [];
              }),
            ]);

            console.log(`[AssetFetcher] Wallet ${wallet.name} results:`, {
              onChain: onChainAssets.length,
              eigen: eigenAssets.length,
              aerodrome: aerodromeAssets.length,
              aave: aaveAssets.length,
              stargate: stargateAssets.length,
              hyperliquid: hyperliquidAssets.length,
            });

            const mappedOnChain = onChainAssets.map((a) => ({
              ...a,
              source: `${wallet.name} (${a.source.replace('Wallet ', '')})`,
            }));

            const mappedEigen = eigenAssets.map((a) => ({
              ...a,
              source: `${wallet.name} (EigenLayer)`,
            }));

            const mappedAerodrome = aerodromeAssets.map((a) => ({
              ...a,
              source: `${wallet.name} (Aerodrome)`,
            }));

            const mappedAave = aaveAssets.map((a) => ({
              ...a,
              source: `${wallet.name} (${a.source})`,
            }));

            const mappedStargate = stargateAssets.map((a) => ({
              ...a,
              source: `${wallet.name} (${a.source})`,
            }));

            list = [
              ...mappedOnChain,
              ...mappedEigen,
              ...mappedAerodrome,
              ...mappedAave,
              ...mappedStargate,
              ...hyperliquidAssets,
            ];
          }
        } catch (e: any) {
          console.error(`Failed to fetch ${wallet.name}`, e);
          toast.error(`Wallet Sync Error (${wallet.name})`, {
            description: 'Failed to fetch on-chain data',
          });
        }
        await settleAccount(wallet.name, list);
      });

      await Promise.all([...cexPromises, ...walletPromises]);
      if (fetchGenRef.current !== gen) return;

      const collectedRaw = Array.from(collectedByAccount.values()).flat();
      const filteredAssets = filterAndSortAssets(
        collectedRaw,
        settings.hideSmallAssets,
        settings.smallAssetsThreshold
      );

      const hasEigenRaw = collectedRaw.some((a) =>
        a.source?.includes('EigenLayer')
      );
      const hasAaveRaw = collectedRaw.some((a) => a.source?.includes('Aave'));
      if (
        hasEigenRaw &&
        !filteredAssets.some((a) => a.source?.includes('EigenLayer'))
      ) {
        console.warn(
          '[AssetFetcher] EigenLayer assets were filtered out. Check hideSmallAssets setting.'
        );
      }
      if (
        hasAaveRaw &&
        !filteredAssets.some((a) => a.source?.includes('Aave'))
      ) {
        console.warn(
          '[AssetFetcher] Aave assets were filtered out. Check hideSmallAssets setting.'
        );
      }

      // 先提交汇总，缓存失败不应让 All 变成 $0
      setAssets(filteredAssets);
      setAccountAssets({});
      setIsInitialLoad(false);
      setError(null);

      try {
        await assetCache.set(collectedRaw);
      } catch (cacheErr) {
        console.error('[AssetFetcher] Failed to persist asset cache', cacheErr);
      }
    } catch (e) {
      if (fetchGenRef.current !== gen) return;

      // 账户已到齐时仍可拼出 All，避免只亮红条却总资产为 0
      const fallbackRaw = Array.from(collectedByAccount.values()).flat();
      if (fallbackRaw.length > 0) {
        setAssets(
          filterAndSortAssets(
            fallbackRaw,
            settings.hideSmallAssets,
            settings.smallAssetsThreshold
          )
        );
        setAccountAssets({});
        setIsInitialLoad(false);
        setError(null);
        console.error('[AssetFetcher] Recovered All from settled accounts', e);
        try {
          await assetCache.set(fallbackRaw);
        } catch (cacheErr) {
          console.error('[AssetFetcher] Failed to persist asset cache', cacheErr);
        }
        return;
      }

      setError('Failed to fetch assets');
      toast.error('Failed to fetch assets', {
        description:
          e instanceof Error
            ? e.message
            : 'Please check your API keys and network connection.',
      });
    } finally {
      if (fetchGenRef.current === gen) {
        setLoading(false);
        setLoadingByAccount({});
      }
    }
  }, [exchanges, wallets, isLoaded, settings, isInitialLoad, t]);

  useEffect(() => {
    if (!isLoaded) return;

    if (exchanges.length === 0 && wallets.length === 0) {
      setAssets([]);
      setAccountAssets({});
      setLoadingByAccount({});
      setIsInitialLoad(true);
      return;
    }

    if (isInitialLoad) {
      assetCache
        .get()
        .then((cachedAssets) => {
          if (cachedAssets && cachedAssets.length > 0) {
            console.log(
              '[AssetFetcher] Using cached assets:',
              cachedAssets.length
            );
            setAssets(
              filterAndSortAssets(
                cachedAssets,
                settings.hideSmallAssets,
                settings.smallAssetsThreshold
              )
            );
            setIsInitialLoad(false);
          } else {
            fetchAssets(false);
          }
        })
        .catch(() => {
          fetchAssets(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, exchanges.length, wallets.length, isInitialLoad]);

  useEffect(() => {
    if (!isLoaded || loading) return;

    assetCache.get().then((cachedAssets) => {
      if (!cachedAssets || cachedAssets.length === 0) return;

      setAssets(
        filterAndSortAssets(
          cachedAssets,
          settings.hideSmallAssets,
          settings.smallAssetsThreshold
        )
      );
    });
  }, [settings.hideSmallAssets, settings.smallAssetsThreshold, isLoaded, loading]);

  useEffect(() => {
    if (!isLoaded) return;

    const fingerprint = getRpcSettingsFingerprint(settings);
    if (
      rpcFingerprintRef.current !== null &&
      rpcFingerprintRef.current !== fingerprint
    ) {
      setIsInitialLoad(false);
      fetchAssets(true);
    }
    rpcFingerprintRef.current = fingerprint;
  }, [settings.customRpcUrls, settings.customSolanaRpcUrl, isLoaded, fetchAssets]);

  const refresh = useCallback(() => {
    setIsInitialLoad(false);
    fetchAssets(true);
  }, [fetchAssets]);

  return {
    assets,
    loading,
    loadingByAccount,
    accountAssets,
    error,
    refresh,
  };
}
