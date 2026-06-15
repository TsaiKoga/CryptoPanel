export interface Asset {
  symbol: string;
  amount: number;
  valueUsd: number;
  price: number;
  source: string; // e.g. "Binance - Main", "Wallet - 0x123..."
  type: 'cex' | 'wallet';
  iconUrl?: string;
  /**
   * When true, indicates the asset list is incomplete due to a fetch/enumeration failure.
   * This is used to surface a user-facing warning without breaking the overall sync.
   */
  loadFailed?: boolean;
  // Optional fields for precise price fetching
  chainId?: number;
  contractAddress?: string;
  chainName?: string; // For DeFiLlama mapping e.g. "ethereum", "base"
}

export type ExchangeType = 'binance' | 'okx';

export interface ExchangeConfig {
  id: string;
  type: ExchangeType;
  name: string;
  apiKey: string;
  secret: string;
  password?: string; // Required for OKX (Passphrase)
}

export type WalletType = 'evm' | 'sol';

export interface WalletConfig {
  id: string;
  address: string;
  name: string;
  type?: WalletType; // 旧数据默认 evm
}

export type Language = 'zh' | 'en';

export type AiProvider = 'openai' | 'deepseek' | 'custom';

export type AiPrivacyMode = 'percent_only' | 'include_amounts';

export interface AiSettings {
  enabled: boolean;
  provider: AiProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  privacyMode: AiPrivacyMode;
}

export type PortfolioRiskFlag =
  | 'high_single_asset_concentration'
  | 'high_top3_concentration'
  | 'high_cex_custody'
  | 'low_stablecoin_buffer'
  | 'partial_price_missing'
  | 'load_failed';

export interface PortfolioHolding {
  symbol: string;
  valueUsd: number;
  pct: number;
  venue: 'cex' | 'onchain' | 'mixed';
}

export interface PortfolioSnapshot {
  totalUsd: number;
  assetCount: number;
  holdings: PortfolioHolding[];
  concentration: {
    top1Pct: number;
    top3Pct: number;
    hhi: number;
  };
  venueSplit: {
    cexUsd: number;
    onchainUsd: number;
    cexPct: number;
    onchainPct: number;
  };
  stablecoinPct: number;
  btcEthPct: number;
  healthScore: number;
  flags: PortfolioRiskFlag[];
  dataQuality: {
    loadFailedCount: number;
    zeroPriceCount: number;
  };
}

export interface AiAnalysisResult {
  healthScore: number;
  summary: string;
  risks: string[];
  suggestions: string[];
  questionsToConsider: string[];
}

export interface AppSettings {
  hideSmallAssets: boolean;
  smallAssetsThreshold: number; // e.g. 1 USD
  currency: 'USD';
  language: Language; // 'zh' for Chinese, 'en' for English
  /** chainId (string) -> custom RPC URL; empty values are ignored */
  customRpcUrls?: Record<string, string>;
  /** Custom Solana mainnet RPC URL */
  customSolanaRpcUrl?: string;
  ai?: AiSettings;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  privacyMode: 'percent_only',
};
