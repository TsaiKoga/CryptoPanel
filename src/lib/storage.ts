// Storage utility that works in both web and Chrome extension environments
import { ExchangeConfig, WalletConfig, AppSettings } from '@/types';

interface StoreData {
  exchanges: ExchangeConfig[];
  wallets: WalletConfig[];
  settings: AppSettings;
}

const STORAGE_KEY = 'crypto-panel-data-v1';

// Check if running in Chrome extension
export const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage;

// Chrome storage wrapper
export const storage = {
  async get(): Promise<StoreData | null> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
          try {
            const data = result[STORAGE_KEY];
            resolve(data ? JSON.parse(data) : null);
          } catch (e) {
            console.error('Failed to parse storage', e);
            resolve(null);
          }
        });
      });
    } else {
      // Fallback to localStorage for web
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse storage', e);
          return null;
        }
      }
      return null;
    }
  },

  async set(data: StoreData): Promise<void> {
    if (isChromeExtension) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(data) }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } else {
      // Fallback to localStorage for web
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return Promise.resolve();
    }
  },
};

