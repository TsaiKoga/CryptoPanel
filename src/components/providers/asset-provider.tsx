"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ExchangeConfig, WalletConfig, AppSettings } from '@/types';
import { storage, assetCache } from '@/lib/storage';
import { randomUUID } from '@/lib/uuid';
import { applyRpcSettings, getRpcSettingsFingerprint } from '@/lib/apply-rpc-settings';

interface StoreData {
  exchanges: ExchangeConfig[];
  wallets: WalletConfig[];
  settings: AppSettings;
}

interface AssetContextType extends StoreData {
  isLoaded: boolean;
  addExchange: (config: Omit<ExchangeConfig, 'id'>) => void;
  removeExchange: (id: string) => void;
  addWallet: (config: Omit<WalletConfig, 'id'>) => void;
  removeWallet: (id: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  hideSmallAssets: true,
  smallAssetsThreshold: 1,
  currency: 'USD',
  language: 'en', // Default to English
};

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export function AssetProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoreData>({
    exchanges: [],
    wallets: [],
    settings: DEFAULT_SETTINGS,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const rpcFingerprintRef = useRef<string | null>(null);

  // Load from storage on mount
  useEffect(() => {
    storage.get().then((stored) => {
      if (stored) {
        // Merge with default settings to ensure new fields exist
        setData({
            ...stored,
            settings: { ...DEFAULT_SETTINGS, ...stored.settings }
        });
      }
      setIsLoaded(true);
    }).catch((e) => {
      console.error("Failed to load storage", e);
      setIsLoaded(true);
    });
  }, []);

  // Apply RPC overrides whenever settings change; clear asset cache when RPC changes
  useEffect(() => {
    if (!isLoaded) return;

    applyRpcSettings(data.settings);

    const fingerprint = getRpcSettingsFingerprint(data.settings);
    if (rpcFingerprintRef.current !== null && rpcFingerprintRef.current !== fingerprint) {
      assetCache.clear().catch((e) => {
        console.error('Failed to clear asset cache after RPC change', e);
      });
    }
    rpcFingerprintRef.current = fingerprint;
  }, [data.settings, isLoaded]);

  // Save to storage on change
  useEffect(() => {
    if (isLoaded) {
      storage.set(data).catch((e) => {
        console.error("Failed to save storage", e);
      });
    }
  }, [data, isLoaded]);

  const addExchange = (config: Omit<ExchangeConfig, 'id'>) => {
    const newExchange: ExchangeConfig = {
      ...config,
      id: randomUUID(),
    };
    setData(prev => ({ ...prev, exchanges: [...prev.exchanges, newExchange] }));
  };

  const removeExchange = (id: string) => {
    setData(prev => ({ ...prev, exchanges: prev.exchanges.filter(e => e.id !== id) }));
  };

  const addWallet = (config: Omit<WalletConfig, 'id'>) => {
    const newWallet: WalletConfig = {
      ...config,
      id: randomUUID(),
    };
    setData(prev => ({ ...prev, wallets: [...prev.wallets, newWallet] }));
  };

  const removeWallet = (id: string) => {
    setData(prev => ({ ...prev, wallets: prev.wallets.filter(w => w.id !== id) }));
  };

  const updateSettings = (settings: Partial<AppSettings>) => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  };

  return (
    <AssetContext.Provider
      value={{
        ...data,
        isLoaded,
        addExchange,
        removeExchange,
        addWallet,
        removeWallet,
        updateSettings,
      }}
    >
      {children}
    </AssetContext.Provider>
  );
}

export function useAssetStore() {
  const context = useContext(AssetContext);
  if (context === undefined) {
    throw new Error('useAssetStore must be used within an AssetProvider');
  }
  return context;
}

