// API client that works in both web and Chrome extension environments
import { Asset, ExchangeConfig, AiAnalysisResult, AiSettings, Language, PortfolioSnapshot } from '@/types';
import { MarketRates } from '@/lib/rates';
import { callAiAnalysis, getAiEndpoint, isLocalAiEndpoint } from '@/lib/ai-analyze';
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
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.error || error.details || `Failed to fetch balance (${res.status})`
        );
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
    if (message.action === 'fetchMarketRates') {
      const res = await fetch('/api/rates');
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch market rates');
      }
      return res.json();
    }
    if (message.action === 'analyzePortfolio') {
      const { url } = getAiEndpoint(message.aiSettings as AiSettings);
      if (!isLocalAiEndpoint(url)) {
        throw new Error(
          'Cloud AI providers require the Chrome extension. Use a local endpoint (e.g. Ollama) on web, or install the extension.'
        );
      }
      return callAiAnalysis(
        message.snapshot as PortfolioSnapshot,
        message.aiSettings as AiSettings,
        message.language as Language
      );
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

export async function fetchMarketRates(): Promise<MarketRates> {
  return sendMessage<MarketRates>({ action: 'fetchMarketRates' });
}

export async function analyzePortfolio(
  snapshot: PortfolioSnapshot,
  aiSettings: AiSettings,
  language: Language
): Promise<AiAnalysisResult> {
  return sendMessage<AiAnalysisResult>({
    action: 'analyzePortfolio',
    snapshot,
    aiSettings,
    language,
  });
}

