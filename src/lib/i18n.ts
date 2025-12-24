export type Language = 'zh' | 'en';

export const translations = {
  zh: {
    // Dashboard
    dashboard: {
      title: '资产看板',
      subtitle: '统一管理您的加密货币资产',
      totalAssets: '总资产估值',
      assetCount: '包含 {count} 个资产',
      assetDistribution: '资产分布',
      calculating: '计算中...',
      loading: '加载中...',
      noAssets: '暂无资产数据',
      noAssetsDesc: '请在设置中添加 API Key 或钱包地址',
      noData: '暂无数据',
      refresh: '刷新',
      settings: '设置',
    },
    // Asset Table
    assetTable: {
      symbol: '币种',
      amount: '数量',
      price: '单价 (USD)',
      value: '总值 (USD)',
      source: '来源',
    },
    // Settings
    settings: {
      pageTitle: '设置',
      cexTab: '交易所 (CEX)',
      walletTab: '链上钱包 (On-Chain)',
      generalTab: '通用设置',
      title: '通用设置',
      subtitle: '配置显示偏好',
      language: '语言',
      languageDesc: '选择界面显示语言',
      hideSmallAssets: '隐藏小额资产',
      hideSmallAssetsDesc: '隐藏价值低于阈值的资产',
      hideSmallAssetsWarning: '注意: 未获取到价格的代币(如新 MEME) 将显示为 $0，会被此选项隐藏。',
      smallAssetsThreshold: '小额资产阈值 (USD)',
      smallAssetsThresholdPlaceholder: '例如: 1',
    },
    // CEX Manager
    cexManager: {
      title: '交易所 API 管理',
      subtitle: '添加您的 Binance 或 OKX API Key (仅保存在本地)',
      exchange: '交易所',
      exchangePlaceholder: '选择交易所',
      name: '备注名称',
      namePlaceholder: '例如: 主账号',
      apiKey: 'API Key',
      secretKey: 'Secret Key',
      passphrase: 'Passphrase (OKX)',
      passphrasePlaceholder: 'API Passphrase',
      addExchange: '添加交易所',
      addedExchanges: '已添加的交易所',
      noConfig: '暂无配置',
      operation: '操作',
    },
    // Wallet Manager
    walletManager: {
      title: '钱包地址管理',
      subtitle: '添加您的链上钱包地址 (仅保存在本地)',
      address: '钱包地址',
      addressPlaceholder: '例如: 0x1234...',
      name: '备注名称',
      namePlaceholder: '例如: 主钱包',
      addWallet: '添加钱包',
      addedWallets: '已添加的钱包',
      noConfig: '暂无配置',
      operation: '操作',
      invalidAddress: '请输入有效的 EVM 钱包地址',
    },
    // Tabs
    tabs: {
      all: '全部汇总',
      cex: '交易所',
      wallet: '钱包',
    },
    // Errors
    errors: {
      okxPassphraseError: 'OKX Passphrase 错误',
      okxPassphraseErrorDesc: '请检查您的 OKX Passphrase 是否正确，并在设置中更新。',
    },
    // Theme
    theme: {
      light: '浅色',
      dark: '深色',
      system: '跟随系统',
    },
  },
  en: {
    // Dashboard
    dashboard: {
      title: 'Asset Dashboard',
      subtitle: 'Unified management of your cryptocurrency assets',
      totalAssets: 'Total Asset Value',
      assetCount: 'Contains {count} assets',
      assetDistribution: 'Asset Distribution',
      calculating: 'Calculating...',
      loading: 'Loading...',
      noAssets: 'No asset data',
      noAssetsDesc: 'Please add API Key or wallet address in settings',
      noData: 'No data',
      refresh: 'Refresh',
      settings: 'Settings',
    },
    // Asset Table
    assetTable: {
      symbol: 'Symbol',
      amount: 'Amount',
      price: 'Price (USD)',
      value: 'Value (USD)',
      source: 'Source',
    },
    // Settings
    settings: {
      pageTitle: 'Settings',
      cexTab: 'Exchange (CEX)',
      walletTab: 'On-Chain Wallet',
      generalTab: 'General Settings',
      title: 'General Settings',
      subtitle: 'Configure display preferences',
      language: 'Language',
      languageDesc: 'Select interface display language',
      hideSmallAssets: 'Hide Small Assets',
      hideSmallAssetsDesc: 'Hide assets below the threshold value',
      hideSmallAssetsWarning: 'Note: Tokens without price data (e.g., new MEME coins) will show as $0 and will be hidden by this option.',
      smallAssetsThreshold: 'Small Assets Threshold (USD)',
      smallAssetsThresholdPlaceholder: 'e.g.: 1',
    },
    // CEX Manager
    cexManager: {
      title: 'Exchange API Management',
      subtitle: 'Add your Binance or OKX API Key (stored locally only)',
      exchange: 'Exchange',
      exchangePlaceholder: 'Select exchange',
      name: 'Name',
      namePlaceholder: 'e.g.: Main Account',
      apiKey: 'API Key',
      secretKey: 'Secret Key',
      passphrase: 'Passphrase (OKX)',
      passphrasePlaceholder: 'API Passphrase',
      addExchange: 'Add Exchange',
      addedExchanges: 'Added Exchanges',
      noConfig: 'No configuration',
      operation: 'Operation',
    },
    // Wallet Manager
    walletManager: {
      title: 'Wallet Address Management',
      subtitle: 'Add your on-chain wallet addresses (stored locally only)',
      address: 'Wallet Address',
      addressPlaceholder: 'e.g.: 0x1234...',
      name: 'Name',
      namePlaceholder: 'e.g.: Main Wallet',
      addWallet: 'Add Wallet',
      addedWallets: 'Added Wallets',
      noConfig: 'No configuration',
      operation: 'Operation',
      invalidAddress: 'Please enter a valid EVM wallet address',
    },
    // Tabs
    tabs: {
      all: 'All Assets',
      cex: 'Exchange',
      wallet: 'Wallet',
    },
    // Errors
    errors: {
      okxPassphraseError: 'OKX Passphrase Incorrect',
      okxPassphraseErrorDesc: 'Please check if your OKX Passphrase is correct and update it in settings.',
    },
    // Theme
    theme: {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    },
  },
};

export function getTranslation(lang: Language, key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to Chinese if key not found
      value = translations.zh;
      for (const k2 of keys) {
        value = value?.[k2];
      }
      break;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Replace placeholders
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }
  
  return value;
}

