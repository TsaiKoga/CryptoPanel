// Background service worker for Chrome extension
import { Asset, ExchangeConfig } from './types';

// Handle messages from popup/options pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchExchangeBalance') {
    handleExchangeBalance(request.exchange)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'fetchPrices') {
    handleFetchPrices(request.assets)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Web Crypto API HMAC-SHA256 helper
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Web Crypto API HMAC-SHA256 Base64 helper (for OKX)
async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// 币安 API 签名辅助函数
async function binanceSignedRequest(
  endpoint: string,
  apiKey: string,
  secret: string,
  params: Record<string, any> = {}
): Promise<any> {
  const baseUrl = 'https://api.binance.com';
  const timestamp = Date.now();
  
  // 构建查询参数
  const queryParams = new URLSearchParams({
    ...params,
    timestamp: timestamp.toString(),
  });
  
  // 生成签名
  const signature = await hmacSha256(secret, queryParams.toString());
  queryParams.append('signature', signature);
  
  const url = `${baseUrl}${endpoint}?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': apiKey,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Binance API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

// 获取币安理财资产
async function fetchBinanceEarnAssets(
  apiKey: string,
  secret: string
): Promise<Asset[]> {
  const earnAssets: Asset[] = [];
  
  try {
    // 1. 获取灵活赚币持仓
    try {
      const flexibleData = await binanceSignedRequest(
        '/sapi/v1/simple-earn/flexible/position',
        apiKey,
        secret,
        {}
      );

      const rows = Array.isArray(flexibleData)
        ? flexibleData
        : Array.isArray(flexibleData?.rows)
          ? flexibleData.rows
          : [];

      if (rows.length > 0) {
        for (const position of rows) {
          const totalAmount = position.totalAmount || position.totalAmountInUSDT || position.amount;
          if (totalAmount && parseFloat(totalAmount) > 0) {
            const amount = parseFloat(totalAmount);
            const symbol = position.asset || 
                          position.productId?.split('_')[0] || 
                          position.productId?.replace(/.*_/, '') ||
                          'UNKNOWN';
            
            earnAssets.push({
              symbol: `${symbol} (灵活赚币)`,
              amount,
              price: 0,
              valueUsd: 0,
              source: 'Binance - 灵活赚币',
              type: 'cex',
            });
          }
        }
      }
    } catch (e: any) {
      console.warn('[Binance] Failed to fetch flexible earn positions:', e.message);
    }
    
    // 2. 获取锁定赚币持仓
    try {
      const lockedPositions = await binanceSignedRequest(
        '/sapi/v1/simple-earn/locked/position',
        apiKey,
        secret,
        {}
      );
      
      if (Array.isArray(lockedPositions)) {
        for (const position of lockedPositions) {
          const totalAmount = position.totalAmount || position.totalAmountInUSDT || position.amount;
          if (totalAmount && parseFloat(totalAmount) > 0) {
            const amount = parseFloat(totalAmount);
            const symbol = position.asset || 
                          position.projectId?.split('_')[0] || 
                          position.projectId?.replace(/.*_/, '') ||
                          'UNKNOWN';
            
            earnAssets.push({
              symbol: `${symbol} (锁定赚币)`,
              amount,
              price: 0,
              valueUsd: 0,
              source: 'Binance - 锁定赚币',
              type: 'cex',
            });
          }
        }
      }
    } catch (e: any) {
      console.warn('[Binance] Failed to fetch locked earn positions:', e.message);
    }
    
    // 3. 获取质押持仓
    const stakingProducts = ['STAKING', 'F_DEFI', 'L_DEFI'];
    for (const product of stakingProducts) {
      try {
        const stakingPositions = await binanceSignedRequest(
          '/sapi/v1/staking/position',
          apiKey,
          secret,
          { product }
        );
        
        if (Array.isArray(stakingPositions)) {
          for (const position of stakingPositions) {
            const amountFields = ['amount', 'totalAmount', 'quantity', 'total', 'stakedAmount'];
            let amount = 0;
            for (const field of amountFields) {
              if (position[field] !== undefined) {
                amount = parseFloat(position[field] || '0');
                if (amount > 0) break;
              }
            }
            
            if (amount > 0) {
              const symbol = position.asset || position.symbol || 'UNKNOWN';
              const productName = product === 'F_DEFI' ? '灵活质押' : product === 'L_DEFI' ? '锁定DeFi质押' : '质押';
              
              earnAssets.push({
                symbol: `${symbol} (${productName})`,
                amount,
                price: 0,
                valueUsd: 0,
                source: `Binance - ${productName}`,
                type: 'cex',
              });
            }
          }
        }
      } catch (e: any) {
        console.warn(`[Binance] Failed to fetch ${product} staking positions:`, e.message);
      }
    }
    
    // 4. 获取 ETH 质押账户
    try {
      const ethStakingAccount = await binanceSignedRequest(
        '/sapi/v2/eth-staking/account',
        apiKey,
        secret,
        {}
      );
      
      if (ethStakingAccount) {
        const possibleFields = [
          'stakedAmount',
          'totalStaked',
          'amount',
          'staked',
          'totalAmount',
          'stakedETH',
          'totalStakedETH'
        ];
        
        let stakedAmount = 0;
        for (const field of possibleFields) {
          if (ethStakingAccount[field] !== undefined) {
            stakedAmount = parseFloat(ethStakingAccount[field] || '0');
            if (stakedAmount > 0) break;
          }
        }
        
        if (stakedAmount > 0) {
          earnAssets.push({
            symbol: 'ETH (活期质押)',
            amount: stakedAmount,
            price: 0,
            valueUsd: 0,
            source: 'Binance - 活期质押',
            type: 'cex',
          });
        }
        
        const wbethFields = ['wbethAmount', 'wbethBalance', 'wbeth', 'wrappedBETH'];
        let wbethAmount = 0;
        for (const field of wbethFields) {
          if (ethStakingAccount[field] !== undefined) {
            wbethAmount = parseFloat(ethStakingAccount[field] || '0');
            if (wbethAmount > 0) break;
          }
        }
        
        if (wbethAmount > 0) {
          earnAssets.push({
            symbol: 'WBETH (质押ETH)',
            amount: wbethAmount,
            price: 0,
            valueUsd: 0,
            source: 'Binance - 活期质押',
            type: 'cex',
          });
        }
      }
    } catch (e: any) {
      console.warn('[Binance] Failed to fetch ETH staking account:', e.message);
    }
    
  } catch (e: any) {
    console.error('[Binance] Error fetching earn assets:', e);
  }
  
  return earnAssets;
}

// OKX API 签名辅助函数
async function okxSignedRequest(
  endpoint: string,
  method: string,
  apiKey: string,
  secret: string,
  passphrase: string,
  body: string = ''
): Promise<any> {
  const baseUrl = 'https://www.okx.com';
  const timestamp = new Date().toISOString();
  
  const message = timestamp + method + endpoint + body;
  const signature = await hmacSha256Base64(secret, message);
  
  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  };
  
  const fetchOptions: any = {
    method,
    headers,
  };
  
  if (body) {
    fetchOptions.body = body;
  }
  
  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OKX API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  if (data.code !== '0') {
    throw new Error(`OKX API error: ${data.code} - ${data.msg || 'Unknown error'}`);
  }
  
  return data.data;
}

// 获取 OKX 资金账号资产
async function fetchOKXFundingAssets(
  apiKey: string,
  secret: string,
  passphrase: string
): Promise<Asset[]> {
  const assets: Asset[] = [];
  
  try {
    const fundingBalances = await okxSignedRequest(
      '/api/v5/asset/balances',
      'GET',
      apiKey,
      secret,
      passphrase,
      ''
    );
    
    if (Array.isArray(fundingBalances)) {
      for (const balance of fundingBalances) {
        const amount = parseFloat(balance.bal || balance.availBal || '0');
        if (amount > 0) {
          assets.push({
            symbol: balance.ccy || 'UNKNOWN',
            amount,
            price: 0,
            valueUsd: 0,
            source: 'OKX - 资金账号',
            type: 'cex',
          });
        }
      }
    }
  } catch (e: any) {
    console.warn('[OKX] Failed to fetch funding account:', e.message);
  }
  
  return assets;
}

// 获取 OKX 交易账号资产
async function fetchOKXTradingAssets(
  apiKey: string,
  secret: string,
  passphrase: string
): Promise<Asset[]> {
  const assets: Asset[] = [];
  
  try {
    const tradingBalance = await okxSignedRequest(
      '/api/v5/account/balance',
      'GET',
      apiKey,
      secret,
      passphrase,
      ''
    );
    
    if (Array.isArray(tradingBalance) && tradingBalance.length > 0) {
      const accountData = tradingBalance[0];
      if (accountData.details && Array.isArray(accountData.details)) {
        for (const detail of accountData.details) {
          const amount = parseFloat(detail.eq || detail.availEq || detail.cashBal || '0');
          if (amount > 0) {
            assets.push({
              symbol: detail.ccy || 'UNKNOWN',
              amount,
              price: 0,
              valueUsd: 0,
              source: 'OKX - 交易账号',
              type: 'cex',
            });
          }
        }
      }
    }
  } catch (e: any) {
    console.warn('[OKX] Failed to fetch trading account:', e.message);
  }
  
  return assets;
}

// 获取币安现货余额
async function fetchBinanceSpotBalance(
  apiKey: string,
  secret: string
): Promise<Asset[]> {
  const assets: Asset[] = [];
  
  try {
    const accountInfo = await binanceSignedRequest(
      '/api/v3/account',
      apiKey,
      secret,
      {}
    );
    
    if (accountInfo.balances && Array.isArray(accountInfo.balances)) {
      for (const balance of accountInfo.balances) {
        const amount = parseFloat(balance.free || '0') + parseFloat(balance.locked || '0');
        if (amount > 0) {
          assets.push({
            symbol: balance.asset,
            amount,
            price: 0,
            valueUsd: 0,
            source: 'Binance',
            type: 'cex',
          });
        }
      }
    }
  } catch (e: any) {
    console.warn('[Binance] Failed to fetch spot balance:', e.message);
  }
  
  return assets;
}

// 获取币安价格（通过 ticker）
async function fetchBinancePrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {
    'USDT': 1,
    'USDC': 1,
    'DAI': 1,
    'FDUSD': 1,
    'BUSD': 1
  };
  
  if (symbols.length === 0) return prices;
  
  try {
    // 币安 ticker API 不需要签名
    const symbolsParam = symbols
      .filter(s => !prices[s])
      .map(s => `${s}USDT`)
      .join(',');
    
    if (symbolsParam) {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbols=[${symbolsParam.split(',').map(s => `"${s}"`).join(',')}]`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          for (const ticker of data) {
            const baseSymbol = ticker.symbol.replace('USDT', '');
            prices[baseSymbol] = parseFloat(ticker.price);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Binance] Failed to fetch prices:', e);
  }
  
  return prices;
}

// 获取 OKX 价格
async function fetchOKXPrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {
    'USDT': 1,
    'USDC': 1,
    'DAI': 1,
    'FDUSD': 1,
    'BUSD': 1
  };
  
  if (symbols.length === 0) return prices;
  
  try {
    const symbolsParam = symbols
      .filter(s => !prices[s])
      .map(s => `${s}-USDT`)
      .join(',');
    
    if (symbolsParam) {
      const response = await fetch(
        `https://www.okx.com/api/v5/market/tickers?instId=${symbolsParam}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.code === '0' && Array.isArray(data.data)) {
          for (const ticker of data.data) {
            const baseSymbol = ticker.instId.split('-')[0];
            prices[baseSymbol] = parseFloat(ticker.last || '0');
          }
        }
      }
    }
  } catch (e) {
    console.warn('[OKX] Failed to fetch prices:', e);
  }
  
  return prices;
}

async function handleExchangeBalance(exchange: ExchangeConfig): Promise<{ assets: Asset[] }> {
  const { type, apiKey, secret, password } = exchange;
  
  if (!type || !apiKey || !secret) {
    throw new Error('Missing credentials');
  }
  
  const assets: Asset[] = [];
  const symbolsToCheck: string[] = [];
  
  if (type === 'binance') {
    // 获取现货余额
    const spotAssets = await fetchBinanceSpotBalance(apiKey, secret);
    assets.push(...spotAssets);
    
    // 获取理财资产
    const earnAssets = await fetchBinanceEarnAssets(apiKey, secret);
    assets.push(...earnAssets);
    
    // 收集所有币种用于价格查询
    assets.forEach(asset => {
      const baseSymbol = asset.symbol.split(' ')[0]; // 从 "BTC (灵活赚币)" 提取 "BTC"
      if (asset.amount > 0 && !symbolsToCheck.includes(baseSymbol)) {
        symbolsToCheck.push(baseSymbol);
      }
    });
    
    // 获取价格
    const prices = await fetchBinancePrices(symbolsToCheck);
    
    // 更新资产价格
    assets.forEach(asset => {
      const baseSymbol = asset.symbol.split(' ')[0];
      const price = prices[baseSymbol] || 0;
      asset.price = price;
      asset.valueUsd = asset.amount * price;
    });
    
  } else if (type === 'okx') {
    // 获取资金账号资产
    const fundingAssets = await fetchOKXFundingAssets(
      apiKey,
      secret,
      password || ''
    );
    assets.push(...fundingAssets);
    
    // 获取交易账号资产
    const tradingAssets = await fetchOKXTradingAssets(
      apiKey,
      secret,
      password || ''
    );
    assets.push(...tradingAssets);
    
    // 收集所有币种用于价格查询
    assets.forEach(asset => {
      if (asset.amount > 0 && !symbolsToCheck.includes(asset.symbol)) {
        symbolsToCheck.push(asset.symbol);
      }
    });
    
    // 获取价格
    const prices = await fetchOKXPrices(symbolsToCheck);
    
    // 更新资产价格
    assets.forEach(asset => {
      const price = prices[asset.symbol] || 0;
      asset.price = price;
      asset.valueUsd = asset.amount * price;
    });
  } else {
    throw new Error('Unsupported exchange');
  }
  
  assets.sort((a, b) => b.valueUsd - a.valueUsd);
  
  return { assets };
}

async function handleFetchPrices(assets: Asset[]): Promise<{ prices: Record<string, number> }> {
  const prices: Record<string, number> = {
    'USDT': 1,
    'USDC': 1,
    'DAI': 1,
    'FDUSD': 1,
    'BUSD': 1
  };
  
  if (!assets || !Array.isArray(assets) || assets.length === 0) {
    return { prices };
  }
  
  // 分离稳定币和其他币种
  const stablecoins = ['USDT', 'USDC', 'DAI', 'FDUSD', 'BUSD'];
  const coinsToFetch: Asset[] = [];
  
  for (const asset of assets) {
    if (stablecoins.includes(asset.symbol) && asset.price === 0) {
      prices[asset.symbol] = 1;
    } else {
      coinsToFetch.push(asset);
    }
  }
  
  // 准备 DeFiLlama 查询
  const strategyToTokenMap: Record<string, string> = {
    '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6': '0xf951E335afb289353dc249e82926178EaC7DEd78',
    '0x2aebba35224c4f82922162765b46febd8dfe1e14': '0xf951E335afb289353dc249e82926178EaC7DEd78',
  };
  
  const llamaIds = coinsToFetch
    .filter(a => a.chainName && a.contractAddress && a.contractAddress !== '0x0000000000000000000000000000000000000000')
    .map(a => {
      const tokenAddress = strategyToTokenMap[a.contractAddress?.toLowerCase()] || a.contractAddress;
      return `${a.chainName}:${tokenAddress}`;
    })
    .filter(id => id !== null);
  
  // 从 DeFiLlama 获取价格
  if (llamaIds.length > 0) {
    try {
      const idsParam = llamaIds.join(',');
      const response = await fetch(`https://coins.llama.fi/prices/current/${idsParam}`);
      const data = await response.json();
      
      if (data.coins) {
        for (const asset of coinsToFetch) {
          const tokenAddress = strategyToTokenMap[asset.contractAddress?.toLowerCase()] || asset.contractAddress;
          const id = `${asset.chainName}:${tokenAddress}`;
          
          if (data.coins[id]) {
            prices[asset.symbol] = data.coins[id].price;
          }
        }
      }
    } catch (e) {
      console.error("DeFiLlama API error", e);
    }
  }
  
  // 回退到 CryptoCompare
  const missingAssets = coinsToFetch.filter(a => !prices[a.symbol]);
  
  if (missingAssets.length > 0) {
    const symbols = Array.from(new Set(missingAssets.map(a => a.symbol)));
    
    const symbolMapping: Record<string, string> = {
      'stETH (Eigen)': 'STETH',
      'rETH (Eigen)': 'RETH',
      'cbETH (Eigen)': 'CBETH',
      'WETH (Eigen)': 'ETH',
      'swETH (Eigen)': 'SWETH',
      'WETH': 'ETH',
      'ZK': 'ZK',
      'XDOG': 'XDOG',
      'cbBTC': 'BTC',
      'USDBc': 'USDC',
      'TOSHI': 'TOSHI',
      'ZRO': 'ZRO',
      'ZORA': 'ZORA',
      'VIRTUAL': 'VIRTUAL',
    };
    
    const fetchSymbols = symbols.map(s => symbolMapping[s] || s);
    
    if (fetchSymbols.length > 0) {
      try {
        const fsyms = fetchSymbols.join(',');
        const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms}&tsyms=USD`;
        const res = await fetch(url);
        const data = await res.json();
        
        for (const symbol of symbols) {
          const fetchKey = (symbolMapping[symbol] || symbol).toUpperCase();
          if (data[fetchKey] && data[fetchKey].USD) {
            prices[symbol] = data[fetchKey].USD;
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }
  
  return { prices };
}

// Set up alarm for periodic updates
chrome.alarms.create('updateAssets', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateAssets') {
    // Trigger asset update
    chrome.runtime.sendMessage({ action: 'assetUpdateTrigger' }).catch(() => {
      // Ignore errors if no listeners
    });
  }
});

