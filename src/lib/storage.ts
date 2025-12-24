// Storage utility that works in both web and Chrome extension environments
import { ExchangeConfig, WalletConfig, AppSettings, Asset } from '@/types';

interface StoreData {
  exchanges: ExchangeConfig[];
  wallets: WalletConfig[];
  settings: AppSettings;
}

interface CachedAssets {
  assets: Asset[];
  timestamp: number;
}

interface CachedRates {
  btcPrice: number;
  usdToCny: number;
  timestamp: number;
}

const STORAGE_KEY = 'crypto-panel-data-v1';
const CACHE_KEY = 'crypto-panel-assets-cache-v1';
const RATES_CACHE_KEY = 'crypto-panel-rates-cache-v1';
const CURRENCY_KEY = 'crypto-panel-currency-v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (but we'll only use cache until manual refresh)
const RATES_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for rates (BTC price and CNY rate)

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

// Asset cache utilities
export const assetCache = {
  async get(): Promise<Asset[] | null> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(CACHE_KEY, (result) => {
          try {
            const cached = result[CACHE_KEY];
            if (!cached) {
              resolve(null);
              return;
            }
            const data: CachedAssets = JSON.parse(cached);
            // Check if cache is still valid (within 24 hours)
            const now = Date.now();
            if (now - data.timestamp < CACHE_DURATION) {
              resolve(data.assets);
            } else {
              // Cache expired, remove it
              chrome.storage.local.remove(CACHE_KEY);
              resolve(null);
            }
          } catch (e) {
            console.error('Failed to parse asset cache', e);
            resolve(null);
          }
        });
      });
    } else {
      // Fallback to localStorage for web
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        try {
          const data: CachedAssets = JSON.parse(stored);
          const now = Date.now();
          if (now - data.timestamp < CACHE_DURATION) {
            return data.assets;
          } else {
            localStorage.removeItem(CACHE_KEY);
            return null;
          }
        } catch (e) {
          console.error('Failed to parse asset cache', e);
          return null;
        }
      }
      return null;
    }
  },

  async set(assets: Asset[]): Promise<void> {
    const cacheData: CachedAssets = {
      assets,
      timestamp: Date.now(),
    };
    
    if (isChromeExtension) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [CACHE_KEY]: JSON.stringify(cacheData) }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } else {
      // Fallback to localStorage for web
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      return Promise.resolve();
    }
  },

  async clear(): Promise<void> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(CACHE_KEY, () => {
          resolve();
        });
      });
    } else {
      localStorage.removeItem(CACHE_KEY);
      return Promise.resolve();
    }
  },
};

// Rates cache utilities (BTC price and USD/CNY rate)
export const ratesCache = {
  async get(): Promise<{ btcPrice: number; usdToCny: number } | null> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(RATES_CACHE_KEY, (result) => {
          try {
            const cached = result[RATES_CACHE_KEY];
            if (!cached) {
              resolve(null);
              return;
            }
            const data: CachedRates = JSON.parse(cached);
            // Check if cache is still valid (within 30 minutes)
            const now = Date.now();
            if (now - data.timestamp < RATES_CACHE_DURATION) {
              resolve({
                btcPrice: data.btcPrice,
                usdToCny: data.usdToCny,
              });
            } else {
              // Cache expired, remove it
              chrome.storage.local.remove(RATES_CACHE_KEY);
              resolve(null);
            }
          } catch (e) {
            console.error('Failed to parse rates cache', e);
            resolve(null);
          }
        });
      });
    } else {
      // Fallback to localStorage for web
      const stored = localStorage.getItem(RATES_CACHE_KEY);
      if (stored) {
        try {
          const data: CachedRates = JSON.parse(stored);
          const now = Date.now();
          if (now - data.timestamp < RATES_CACHE_DURATION) {
            return {
              btcPrice: data.btcPrice,
              usdToCny: data.usdToCny,
            };
          } else {
            localStorage.removeItem(RATES_CACHE_KEY);
            return null;
          }
        } catch (e) {
          console.error('Failed to parse rates cache', e);
          return null;
        }
      }
      return null;
    }
  },

  async set(btcPrice: number, usdToCny: number): Promise<void> {
    const cacheData: CachedRates = {
      btcPrice,
      usdToCny,
      timestamp: Date.now(),
    };
    
    if (isChromeExtension) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [RATES_CACHE_KEY]: JSON.stringify(cacheData) }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } else {
      // Fallback to localStorage for web
      localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(cacheData));
      return Promise.resolve();
    }
  },

  async clear(): Promise<void> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(RATES_CACHE_KEY, () => {
          resolve();
        });
      });
    } else {
      localStorage.removeItem(RATES_CACHE_KEY);
      return Promise.resolve();
    }
  },
};

// Currency preference utilities (USD, CNY, BTC)
export const currencyPreference = {
  async get(): Promise<'USD' | 'CNY' | 'BTC' | null> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(CURRENCY_KEY, (result) => {
          try {
            const currency = result[CURRENCY_KEY];
            if (currency && ['USD', 'CNY', 'BTC'].includes(currency)) {
              resolve(currency as 'USD' | 'CNY' | 'BTC');
            } else {
              resolve(null);
            }
          } catch (e) {
            console.error('Failed to parse currency preference', e);
            resolve(null);
          }
        });
      });
    } else {
      // Fallback to localStorage for web
      const stored = localStorage.getItem(CURRENCY_KEY);
      if (stored && ['USD', 'CNY', 'BTC'].includes(stored)) {
        return stored as 'USD' | 'CNY' | 'BTC';
      }
      return null;
    }
  },

  async set(currency: 'USD' | 'CNY' | 'BTC'): Promise<void> {
    if (isChromeExtension) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [CURRENCY_KEY]: currency }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } else {
      // Fallback to localStorage for web
      localStorage.setItem(CURRENCY_KEY, currency);
      return Promise.resolve();
    }
  },
};

