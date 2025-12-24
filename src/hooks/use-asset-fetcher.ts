"use client"

import { useState, useEffect, useCallback } from 'react';
import { useAssetStore } from '@/components/providers/asset-provider';
import { Asset } from '@/types';
import { fetchOnChainAssets } from '@/lib/onchain';
import { fetchEigenLayerAssets } from '@/lib/protocols/eigenlayer';
import { fetchAerodromeAssets } from '@/lib/protocols/aerodrome';
import { fetchAaveAssets } from '@/lib/protocols/aave';
import { fetchStargateAssets } from '@/lib/protocols/stargate';
import { assetCache } from '@/lib/storage';
import { toast } from 'sonner';
import { useI18n } from './use-i18n';

export function useAssetFetcher() {
  const { exchanges, wallets, isLoaded, settings } = useAssetStore();
  const { t } = useI18n();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchAssets = useCallback(async (forceRefresh = false) => {
    if (!isLoaded) return;
    
    // 如果不是强制刷新，先检查缓存
    if (!forceRefresh && isInitialLoad) {
      const cachedAssets = await assetCache.get();
      if (cachedAssets && cachedAssets.length > 0) {
        console.log('[AssetFetcher] Using cached assets:', cachedAssets.length);
        // 应用设置过滤
        const filteredAssets = settings.hideSmallAssets 
          ? cachedAssets.filter(a => a.valueUsd >= settings.smallAssetsThreshold)
          : cachedAssets;
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
                    source: `${exchange.name}` 
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
              console.log(`[AssetFetcher] Fetching assets for wallet ${wallet.name} (${wallet.address})`);
              const [onChainAssets, eigenAssets, aerodromeAssets, aaveAssets, stargateAssets] = await Promise.all([
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
                  })
              ]);

              console.log(`[AssetFetcher] Wallet ${wallet.name} results:`, {
                  onChain: onChainAssets.length,
                  eigen: eigenAssets.length,
                  aerodrome: aerodromeAssets.length,
                  aave: aaveAssets.length,
                  stargate: stargateAssets.length
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

              return [...mappedOnChain, ...mappedEigen, ...mappedAerodrome, ...mappedAave, ...mappedStargate];
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
                  if (asset.price === 0) {
                      // 先尝试完整符号匹配
                      if (prices[asset.symbol]) {
                          asset.price = prices[asset.symbol];
                          asset.valueUsd = asset.amount * asset.price;
                      } else {
                          // 如果完整符号不匹配，尝试提取基础符号（去掉括号部分）
                          const baseSymbol = asset.symbol.split(' ')[0].trim();
                          if (prices[baseSymbol]) {
                              asset.price = prices[baseSymbol];
                              asset.valueUsd = asset.amount * asset.price;
                              console.log(`[AssetFetcher] Updated price for ${asset.symbol} using base symbol ${baseSymbol}: $${asset.price}`);
                          }
                      }
                  }
              });
          } catch (e) {
              console.error("Failed to fetch prices for assets", e);
          }
      }
      
      // Filter small assets
      const filteredAssets = settings.hideSmallAssets 
        ? allAssets.filter(a => a.valueUsd >= settings.smallAssetsThreshold)
        : allAssets;

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
      
      // 保存到缓存
      await assetCache.set(filteredAssets);
      
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
          const filteredAssets = settings.hideSmallAssets 
            ? cachedAssets.filter(a => a.valueUsd >= settings.smallAssetsThreshold)
            : cachedAssets;
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
  
  // 当设置改变时，重新过滤已缓存的资产
  useEffect(() => {
    if (assets.length > 0 && !loading) {
      const filteredAssets = settings.hideSmallAssets 
        ? assets.filter(a => a.valueUsd >= settings.smallAssetsThreshold)
        : assets;
      filteredAssets.sort((a, b) => b.valueUsd - a.valueUsd);
      if (filteredAssets.length !== assets.length || 
          filteredAssets.some((a, i) => a.valueUsd !== assets[i]?.valueUsd)) {
        setAssets(filteredAssets);
      }
    }
  }, [settings.hideSmallAssets, settings.smallAssetsThreshold]);

  // 刷新函数：强制刷新并清除缓存
  const refresh = useCallback(() => {
    setIsInitialLoad(false);
    fetchAssets(true);
  }, [fetchAssets]);

  return { assets, loading, error, refresh };
}
