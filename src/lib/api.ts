// API client that works in both web and Chrome extension environments
import { Asset, ExchangeConfig } from '@/types';
import { isChromeExtension } from './storage';

// Send message to background script
async function sendMessage<T>(message: any): Promise<T> {
  if (isChromeExtension) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      });
    });
  } else {
    // Fallback to direct API calls for web
    if (message.action === 'fetchExchangeBalance') {
      const res = await fetch('/api/exchange/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message.exchange),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch balance');
      }
      return res.json();
    }
    if (message.action === 'fetchPrices') {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: message.assets }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch prices');
      }
      return res.json();
    }
    throw new Error('Unknown action');
  }
}

export async function fetchExchangeBalance(exchange: ExchangeConfig): Promise<{ assets: Asset[] }> {
  return sendMessage<{ assets: Asset[] }>({
    action: 'fetchExchangeBalance',
    exchange,
  });
}

export async function fetchPrices(assets: Asset[]): Promise<{ prices: Record<string, number> }> {
  return sendMessage<{ prices: Record<string, number> }>({
    action: 'fetchPrices',
    assets,
  });
}

