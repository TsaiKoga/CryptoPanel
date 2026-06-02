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

export interface AppSettings {
  hideSmallAssets: boolean;
  smallAssetsThreshold: number; // e.g. 1 USD
  currency: 'USD';
  language: Language; // 'zh' for Chinese, 'en' for English
}
