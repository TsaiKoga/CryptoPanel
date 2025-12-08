"use client"

import { useState, useEffect, useCallback } from 'react';
import { useAssetStore } from '@/components/providers/asset-provider';
import { Asset } from '@/types';
import { fetchOnChainAssets } from '@/lib/onchain';
import { fetchEigenLayerAssets } from '@/lib/protocols/eigenlayer';
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
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (data.assets) {
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
              const [onChainAssets, eigenAssets] = await Promise.all([
                  fetchOnChainAssets(wallet.address),
                  fetchEigenLayerAssets(wallet.address)
              ]);

              const mappedOnChain = onChainAssets.map(a => ({ 
                  ...a, 
                  source: `${wallet.name} (${a.source.replace('Wallet ', '')})` 
              }));

              const mappedEigen = eigenAssets.map(a => ({
                  ...a,
                  source: `${wallet.name} (EigenLayer)`
              }));

              return [...mappedOnChain, ...mappedEigen];
          } catch (e: any) {
              console.error(`Failed to fetch ${wallet.name}`, e);
              toast.error(`Wallet Sync Error (${wallet.name})`, { description: "Failed to fetch on-chain data" });
              return [];
          }
      });

      const results = await Promise.all([...cexPromises, ...walletPromises]);
      results.forEach(list => allAssets.push(...list));

      // 3. Fetch Prices for Wallet Assets (which have 0 price)
      const walletAssetsToPrice = allAssets.filter(a => a.type === 'wallet' && a.price === 0);
      if (walletAssetsToPrice.length > 0) {
          const symbols = Array.from(new Set(walletAssetsToPrice.map(a => a.symbol)));
          try {
              const priceRes = await fetch('/api/prices', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ symbols })
              });
              
              if (priceRes.ok) {
                  const { prices } = await priceRes.json();
                  // Update assets with prices
                  allAssets.forEach(asset => {
                      if (asset.type === 'wallet' && prices[asset.symbol]) {
                          asset.price = prices[asset.symbol];
                          asset.valueUsd = asset.amount * asset.price;
                      }
                  });
              }
          } catch (e) {
              console.error("Failed to fetch prices for wallet assets", e);
          }
      }
      
      // Filter small assets
      const filteredAssets = settings.hideSmallAssets 
        ? allAssets.filter(a => a.valueUsd >= settings.smallAssetsThreshold)
        : allAssets;

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
