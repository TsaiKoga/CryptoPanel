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

export function useAssetFetcher() {
  const { exchanges, wallets, isLoaded, settings } = useAssetStore();
  const { t } = useI18n();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const rpcFingerprintRef = useRef<string | null>(null);

  const fetchAssets = useCallback(async (forceRefresh = false) => {
    if (!isLoaded) return;

    // Ensure module-level RPC overrides are applied before any chain requests
    applyRpcSettings(settings);
    
    // 如果不是强制刷新，先检查缓存
    if (!forceRefresh && isInitialLoad) {
      const cachedAssets = await assetCache.get();
      if (cachedAssets && cachedAssets.length > 0) {
        console.log('[AssetFetcher] Using cached assets:', cachedAssets.length);
        // 应用设置过滤
        const filteredAssets = cachedAssets.filter((a) =>
          shouldDisplayAsset(a, settings.hideSmallAssets, settings.smallAssetsThreshold)
        );
        filteredAssets.sort((a, b) => b.valueUsd - a.valueUsd);
        setAssets(filteredAssets);
        setIsInitialLoad(false);
        return;
      }
    }
    
    // 如果是强制刷新，清除缓存
    if (forceRefresh) {
      await assetCache.clear();
    }
    
    setLoading(true);
    setError(null);
    const allAssets: Asset[] = [];

    try {
      // 1. Fetch CEX Assets
      const cexPromises = exchanges.map(async (exchange) => {
        try {
            const { fetchExchangeBalance } = await import('@/lib/api');
            const data = await fetchExchangeBalance(exchange);
            
            if (data?.error) throw new Error(data.error);
            
            if (data?.assets) {
                return data.assets.map((a: Asset) => ({
                    ...a,
                    source: formatOkxDisplaySource(exchange.name, a.source),
                }));
            }
            return [];
        } catch (e: any) {
            console.error(`Failed to fetch ${exchange.name}`, e);
            
            // 检查是否是 OKX Passphrase 错误
            const errorMessage = e.message || String(e);
            if (errorMessage.includes('50105') || errorMessage.includes('Passphrase incorrect') || errorMessage.includes('OK-ACCESS-PASSPHRASE')) {
                toast.error(
                    t('errors.okxPassphraseError'),
                    { 
                        description: t('errors.okxPassphraseErrorDesc'),
                        duration: 8000,
                    }
                );
            } else {
                toast.error(`CEX Sync Error (${exchange.name})`, { description: e.message });
            }
            return [];
        }
      });

      // 2. Fetch Wallet Assets
      const walletPromises = wallets.map(async (wallet) => {
          try {
              const walletType = resolveWalletType(wallet);
              console.log(`[AssetFetcher] Fetching assets for wallet ${wallet.name} (${wallet.address}) type=${walletType}`);

              if (walletType === 'sol') {
                const solAssets = await fetchSolanaAssets(
                  wallet.address,
                  wallet.name,
                  settings.customSolanaRpcUrl
                );
                return solAssets.map((a) => ({
                  ...a,
                  source: `${wallet.name} (Solana)`,
                }));
              }

              const [onChainAssets, eigenAssets, aerodromeAssets, aaveAssets, stargateAssets, hyperliquidAssets] = await Promise.all([
                  fetchOnChainAssets(wallet.address),
                  fetchEigenLayerAssets(wallet.address).catch(e => {
                      console.error(`[AssetFetcher] EigenLayer fetch failed for ${wallet.address}:`, e);
                      return [];
                  }),
                  fetchAerodromeAssets(wallet.address),
                  fetchAaveAssets(wallet.address),
                  fetchStargateAssets(wallet.address).catch(e => {
                      console.error(`[AssetFetcher] Stargate fetch failed for ${wallet.address}:`, e);
                      return [];
                  }),
                  fetchHyperliquidAssets(wallet.address, wallet.name).catch(e => {
                      console.error(`[AssetFetcher] Hyperliquid fetch failed for ${wallet.address}:`, e);
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
              

              const mappedOnChain = onChainAssets.map(a => ({ 
                  ...a, 
                  source: `${wallet.name} (${a.source.replace('Wallet ', '')})` 
              }));

              const mappedEigen = eigenAssets.map(a => ({
                  ...a,
                  source: `${wallet.name} (EigenLayer)`
              }));

              const mappedAerodrome = aerodromeAssets.map(a => ({
                  ...a,
                  source: `${wallet.name} (Aerodrome)`
              }));

              const mappedAave = aaveAssets.map(a => ({
                  ...a,
                  source: `${wallet.name} (${a.source})`
              }));

              const mappedStargate = stargateAssets.map(a => ({
                  ...a,
                  source: `${wallet.name} (${a.source})`
              }));

              return [...mappedOnChain, ...mappedEigen, ...mappedAerodrome, ...mappedAave, ...mappedStargate, ...hyperliquidAssets];
          } catch (e: any) {
              console.error(`Failed to fetch ${wallet.name}`, e);
              toast.error(`Wallet Sync Error (${wallet.name})`, { description: "Failed to fetch on-chain data" });
              return [];
          }
      });

      const results = await Promise.all([...cexPromises, ...walletPromises]);
      results.forEach(list => allAssets.push(...list));

      // 3. Fetch Prices for Assets with 0 price (including CEX assets if backend failed)
      const assetsToPrice = allAssets.filter(a => a.price === 0);
      
      if (assetsToPrice.length > 0) {
          try {
              const { fetchPrices } = await import('@/lib/api');
              const { prices } = await fetchPrices(assetsToPrice);
              
              // Update assets with prices
              allAssets.forEach(asset => {
                  if (asset.price !== 0) return;

                  const base = assetBaseSymbol(asset.symbol);
                  const price =
                    prices[asset.symbol] ??
                    prices[base] ??
                    prices[base.toUpperCase()];

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
              console.error("Failed to fetch prices for assets", e);
          }
      }
      
      const filteredAssets = allAssets.filter((a) =>
        shouldDisplayAsset(a, settings.hideSmallAssets, settings.smallAssetsThreshold)
      );

      // Debug: Check EigenLayer and Aave assets
      const eigenAssets = filteredAssets.filter(a => a.source.includes('EigenLayer'));
      const aaveAssets = filteredAssets.filter(a => a.source.includes('Aave'));
      if (eigenAssets.length === 0 && allAssets.some(a => a.source.includes('EigenLayer'))) {
          console.warn('[AssetFetcher] EigenLayer assets were filtered out. Check hideSmallAssets setting.');
      }
      if (aaveAssets.length === 0 && allAssets.some(a => a.source.includes('Aave'))) {
          console.warn('[AssetFetcher] Aave assets were filtered out. Check hideSmallAssets setting.');
      }

      // Sort by value
      filteredAssets.sort((a, b) => b.valueUsd - a.valueUsd);
      
      // 缓存完整列表，展示层再按设置过滤
      await assetCache.set(allAssets);

      setAssets(filteredAssets);
      setIsInitialLoad(false);
    } catch (e) {
      setError("Failed to fetch assets");
      toast.error("Failed to fetch assets", {
        description: e instanceof Error ? e.message : "Please check your API keys and network connection."
      });
    } finally {
      setLoading(false);
    }
  }, [exchanges, wallets, isLoaded, settings, isInitialLoad]);

  // 初始加载：检查缓存
  useEffect(() => {
    if (!isLoaded) return;
    
    if (exchanges.length === 0 && wallets.length === 0) {
      setAssets([]);
      setIsInitialLoad(true);
      return;
    }

    // 只在初始加载时检查缓存
    if (isInitialLoad) {
      assetCache.get().then((cachedAssets) => {
        if (cachedAssets && cachedAssets.length > 0) {
          console.log('[AssetFetcher] Using cached assets:', cachedAssets.length);
          // 应用设置过滤
          const filteredAssets = cachedAssets.filter((a) =>
            shouldDisplayAsset(a, settings.hideSmallAssets, settings.smallAssetsThreshold)
          );
          filteredAssets.sort((a, b) => b.valueUsd - a.valueUsd);
          setAssets(filteredAssets);
          setIsInitialLoad(false);
        } else {
          // 没有缓存，执行获取
          fetchAssets(false);
        }
      }).catch(() => {
        // 缓存读取失败，执行获取
        fetchAssets(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, exchanges.length, wallets.length, isInitialLoad]);
  
  // 当设置改变时，从完整缓存重新过滤（避免对已过滤列表二次过滤导致资产丢失）
  useEffect(() => {
    if (!isLoaded || loading) return;

    assetCache.get().then((cachedAssets) => {
      if (!cachedAssets || cachedAssets.length === 0) return;

      const filteredAssets = cachedAssets.filter((a) =>
        shouldDisplayAsset(a, settings.hideSmallAssets, settings.smallAssetsThreshold)
      );
      filteredAssets.sort((a, b) => b.valueUsd - a.valueUsd);
      setAssets(filteredAssets);
    });
  }, [settings.hideSmallAssets, settings.smallAssetsThreshold, isLoaded, loading]);

  // RPC 变更后自动重新拉取（自定义节点立即生效）
  useEffect(() => {
    if (!isLoaded) return;

    const fingerprint = getRpcSettingsFingerprint(settings);
    if (rpcFingerprintRef.current !== null && rpcFingerprintRef.current !== fingerprint) {
      setIsInitialLoad(false);
      fetchAssets(true);
    }
    rpcFingerprintRef.current = fingerprint;
  }, [settings.customRpcUrls, settings.customSolanaRpcUrl, isLoaded, fetchAssets]);

  // 刷新函数：强制刷新并清除缓存
  const refresh = useCallback(() => {
    setIsInitialLoad(false);
    fetchAssets(true);
  }, [fetchAssets]);

  return { assets, loading, error, refresh };
}
