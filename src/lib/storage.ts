// Storage utility that works in both web and Chrome extension environments
import { normalizeAnalysisResult } from '@/lib/ai-analyze';
import { FearGreedAlertState } from '@/lib/fear-greed-alerts';
import { ExchangeConfig, WalletConfig, AppSettings, Asset, AiAnalysisResult } from '@/types';

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
  ethPrice?: number;
  usdToCny: number;
  timestamp: number;
}

export type DisplayCurrency = 'USD' | 'CNY' | 'BTC' | 'ETH';

const DISPLAY_CURRENCIES: DisplayCurrency[] = ['USD', 'CNY', 'BTC', 'ETH'];

const STORAGE_KEY = 'crypto-panel-data-v1';
const CACHE_KEY = 'crypto-panel-assets-cache-v1';
const RATES_CACHE_KEY = 'crypto-panel-rates-cache-v1';
const FEAR_GREED_CACHE_KEY = 'crypto-panel-fear-greed-cache-v1';
const FEAR_GREED_ALERT_STATE_KEY = 'crypto-panel-fear-greed-alert-state-v1';
const CURRENCY_KEY = 'crypto-panel-currency-v1';
const ANALYSIS_CACHE_KEY = 'crypto-panel-analysis-cache-v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (but we'll only use cache until manual refresh)
const RATES_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for rates (BTC price and CNY rate)
const FEAR_GREED_CACHE_DURATION = 60 * 60 * 1000; // 1 hour — index updates daily

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

// Rates cache utilities (BTC/ETH price and USD/CNY rate)
export const ratesCache = {
  async get(): Promise<{ btcPrice: number; ethPrice: number; usdToCny: number } | null> {
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
            // Old caches without ethPrice are treated as expired so ETH rate refreshes
            if (now - data.timestamp < RATES_CACHE_DURATION && (data.ethPrice ?? 0) > 0) {
              resolve({
                btcPrice: data.btcPrice,
                ethPrice: data.ethPrice ?? 0,
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
          if (now - data.timestamp < RATES_CACHE_DURATION && (data.ethPrice ?? 0) > 0) {
            return {
              btcPrice: data.btcPrice,
              ethPrice: data.ethPrice ?? 0,
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

  async set(btcPrice: number, usdToCny: number, ethPrice = 0): Promise<void> {
    const cacheData: CachedRates = {
      btcPrice,
      ethPrice,
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

// Fear & Greed Index cache (updates ~daily; refresh hourly)
export const fearGreedCache = {
  async get(): Promise<FearGreedIndex | null> {
    const read = (raw: string | undefined): FearGreedIndex | null => {
      if (!raw) return null;
      try {
        const data = JSON.parse(raw) as FearGreedIndex & { cachedAt?: number };
        const cachedAt = data.cachedAt ?? data.updatedAt ?? 0;
        if (Date.now() - cachedAt > FEAR_GREED_CACHE_DURATION) return null;
        return {
          value: data.value,
          classification: data.classification,
          timestamp: data.timestamp,
          updatedAt: data.updatedAt,
        };
      } catch {
        return null;
      }
    };

    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(FEAR_GREED_CACHE_KEY, (result) => {
          resolve(read(result[FEAR_GREED_CACHE_KEY]));
        });
      });
    }
    return read(localStorage.getItem(FEAR_GREED_CACHE_KEY) ?? undefined);
  },

  async set(data: FearGreedIndex): Promise<void> {
    const payload = JSON.stringify({ ...data, cachedAt: Date.now() });

    if (isChromeExtension) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [FEAR_GREED_CACHE_KEY]: payload }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    }
    localStorage.setItem(FEAR_GREED_CACHE_KEY, payload);
  },
};

export const fearGreedAlertState = {
  async get(): Promise<FearGreedAlertState | null> {
    const read = (raw: string | undefined): FearGreedAlertState | null => {
      if (!raw) return null;
      try {
        return JSON.parse(raw) as FearGreedAlertState;
      } catch {
        return null;
      }
    };

    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(FEAR_GREED_ALERT_STATE_KEY, (result) => {
          resolve(read(result[FEAR_GREED_ALERT_STATE_KEY]));
        });
      });
    }
    return read(localStorage.getItem(FEAR_GREED_ALERT_STATE_KEY) ?? undefined);
  },

  async set(state: FearGreedAlertState): Promise<void> {
    const serialized = JSON.stringify(state);

    if (isChromeExtension) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [FEAR_GREED_ALERT_STATE_KEY]: serialized }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    }
    localStorage.setItem(FEAR_GREED_ALERT_STATE_KEY, serialized);
  },

  async clear(): Promise<void> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(FEAR_GREED_ALERT_STATE_KEY, () => resolve());
      });
    }
    localStorage.removeItem(FEAR_GREED_ALERT_STATE_KEY);
  },
};

// Currency preference utilities (USD, CNY, BTC, ETH)
export const currencyPreference = {
  async get(): Promise<DisplayCurrency | null> {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(CURRENCY_KEY, (result) => {
          try {
            const currency = result[CURRENCY_KEY];
            if (currency && DISPLAY_CURRENCIES.includes(currency)) {
              resolve(currency as DisplayCurrency);
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
      if (stored && DISPLAY_CURRENCIES.includes(stored as DisplayCurrency)) {
        return stored as DisplayCurrency;
      }
      return null;
    }
  },

  async set(currency: DisplayCurrency): Promise<void> {
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

interface CachedAnalysis {
  fingerprint: string;
  result: AiAnalysisResult;
  timestamp: number;
}

const ANALYSIS_CACHE_DURATION = 24 * 60 * 60 * 1000;

export const analysisCache = {
  async get(fingerprint: string): Promise<AiAnalysisResult | null> {
    const read = (raw: string | undefined): AiAnalysisResult | null => {
      if (!raw) return null;
      try {
        const data: CachedAnalysis = JSON.parse(raw);
        if (data.fingerprint !== fingerprint) return null;
        if (Date.now() - data.timestamp > ANALYSIS_CACHE_DURATION) return null;
        return normalizeAnalysisResult({
          healthScore: data.result.healthScore ?? 0,
          summary: data.result.summary ?? '',
          ...data.result,
        });
      } catch {
        return null;
      }
    };

    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(ANALYSIS_CACHE_KEY, (result) => {
          resolve(read(result[ANALYSIS_CACHE_KEY]));
        });
      });
    }
    return read(localStorage.getItem(ANALYSIS_CACHE_KEY) ?? undefined);
  },

  async set(fingerprint: string, result: AiAnalysisResult): Promise<void> {
    const payload: CachedAnalysis = { fingerprint, result, timestamp: Date.now() };
    const serialized = JSON.stringify(payload);

    if (isChromeExtension) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [ANALYSIS_CACHE_KEY]: serialized }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    }
    localStorage.setItem(ANALYSIS_CACHE_KEY, serialized);
  },
};

