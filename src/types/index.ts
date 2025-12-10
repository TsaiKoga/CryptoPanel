export interface Asset {
  symbol: string;
  amount: number;
  valueUsd: number;
  price: number;
  source: string; // e.g. "Binance - Main", "Wallet - 0x123..."
  type: 'cex' | 'wallet';
  iconUrl?: string;
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

export interface WalletConfig {
  id: string;
  address: string;
  name: string;
}

export interface AppSettings {
  hideSmallAssets: boolean;
  smallAssetsThreshold: number; // e.g. 1 USD
  currency: 'USD';
}
