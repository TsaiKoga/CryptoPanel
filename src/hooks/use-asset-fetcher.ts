"use client"

import { useState, useEffect, useCallback } from 'react';
import { useAssetStore } from '@/components/providers/asset-provider';
import { Asset } from '@/types';
import { fetchOnChainAssets } from '@/lib/onchain';
import { fetchEigenLayerAssets } from '@/lib/protocols/eigenlayer';
import { fetchAerodromeAssets } from '@/lib/protocols/aerodrome';
import { fetchAaveAssets } from '@/lib/protocols/aave';
import { toast } from 'sonner';

export function useAssetFetcher() {
  const { exchanges, wallets, isLoaded, settings } = useAssetStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!isLoaded) return;
    
    setLoading(true);
    setError(null);
    const allAssets: Asset[] = [];

    try {
      // 1. Fetch CEX Assets
      const cexPromises = exchanges.map(async (exchange) => {
        try {
            const res = await fetch('/api/exchange/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exchange)
            });
            
            const data = await res.json().catch(() => null);
            
            if (!res.ok) {
                throw new Error(data?.details || data?.error || `Request failed with status ${res.status}`);
            }
            
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
            toast.error(`CEX Sync Error (${exchange.name})`, { description: e.message });
            return [];
        }
      });

      // 2. Fetch Wallet Assets
      const walletPromises = wallets.map(async (wallet) => {
          try {
              console.log(`[AssetFetcher] Fetching assets for wallet ${wallet.name} (${wallet.address})`);
              const [onChainAssets, eigenAssets, aerodromeAssets, aaveAssets] = await Promise.all([
                  fetchOnChainAssets(wallet.address),
                  fetchEigenLayerAssets(wallet.address).catch(e => {
                      console.error(`[AssetFetcher] EigenLayer fetch failed for ${wallet.address}:`, e);
                      return [];
                  }),
                  fetchAerodromeAssets(wallet.address),
                  fetchAaveAssets(wallet.address)
              ]);

              console.log(`[AssetFetcher] Wallet ${wallet.name} results:`, {
                  onChain: onChainAssets.length,
                  eigen: eigenAssets.length,
                  aerodrome: aerodromeAssets.length,
                  aave: aaveAssets.length
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

              return [...mappedOnChain, ...mappedEigen, ...mappedAerodrome, ...mappedAave];
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
              // Pass full asset objects to API to support DeFiLlama chain:address lookup
              const priceRes = await fetch('/api/prices', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ assets: assetsToPrice })
              });
              
              if (priceRes.ok) {
                  const { prices } = await priceRes.json();
                  
                  // Update assets with prices
                  allAssets.forEach(asset => {
                      if (asset.price === 0 && prices[asset.symbol]) {
                          asset.price = prices[asset.symbol];
                          asset.valueUsd = asset.amount * asset.price;
                      }
                  });
              }
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
      
      setAssets(filteredAssets);
    } catch (e) {
      setError("Failed to fetch assets");
      toast.error("Failed to fetch assets", {
        description: "Please check your API keys and network connection."
      });
    } finally {
      setLoading(false);
    }
  }, [exchanges, wallets, isLoaded, settings]);

  useEffect(() => {
    if (isLoaded && (exchanges.length > 0 || wallets.length > 0)) {
        fetchAssets();
    } else {
        setAssets([]);
    }
  }, [fetchAssets, isLoaded, exchanges.length, wallets.length]);

  return { assets, loading, error, refresh: fetchAssets };
}
