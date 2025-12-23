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
  
  console.log('[Binance] Starting to fetch earn assets...');
  
  try {
    // 1. 获取灵活赚币持仓
    try {
      console.log('[Binance] Fetching flexible earn positions...');
      const flexibleData = await binanceSignedRequest(
        '/sapi/v1/simple-earn/flexible/position',
        apiKey,
        secret,
        {}
      );

      console.log('[Binance] Flexible earn response:', JSON.stringify(flexibleData, null, 2));

      const rows = Array.isArray(flexibleData)
        ? flexibleData
        : Array.isArray(flexibleData?.rows)
          ? flexibleData.rows
          : [];

      console.log(`[Binance] Found ${rows.length} flexible earn positions`);

      if (rows.length > 0) {
        for (const position of rows) {
          // 尝试多种字段获取金额
          const totalAmount = position.totalAmount || 
                             position.totalAmountInUSDT || 
                             position.amount ||
                             position.quantity ||
                             position.total ||
                             '0';
          
          const amount = typeof totalAmount === 'string' 
            ? parseFloat(totalAmount) 
            : typeof totalAmount === 'number'
              ? totalAmount
              : 0;
          
          if (amount > 0) {
            // 尝试多种方式获取币种符号
            const symbol = position.asset || 
                          (position.productId ? position.productId.split('_')[0] : null) ||
                          (position.productId ? position.productId.replace(/.*_/, '') : null) ||
                          (position.productId ? position.productId.replace(/[0-9]/g, '') : null) ||
                          'UNKNOWN';
            
            console.log(`[Binance] Adding flexible earn asset: ${symbol}, amount: ${amount}, raw data:`, JSON.stringify(position));
            
            earnAssets.push({
              symbol: `${symbol} (灵活赚币)`,
              amount,
              price: 0,
              valueUsd: 0,
              source: 'Binance - 灵活赚币',
              type: 'cex',
            });
          } else {
            console.warn(`[Binance] Skipping position with zero or invalid amount:`, JSON.stringify(position));
          }
        }
      } else {
        console.warn('[Binance] No rows found in flexible earn response');
      }
    } catch (e: any) {
      console.error('[Binance] Failed to fetch flexible earn positions:', e.message, e);
    }
    
    // 2. 获取锁定赚币持仓
    try {
      console.log('[Binance] Fetching locked earn positions...');
      const lockedPositions = await binanceSignedRequest(
        '/sapi/v1/simple-earn/locked/position',
        apiKey,
        secret,
        {}
      );
      
      console.log('[Binance] Locked earn response:', JSON.stringify(lockedPositions, null, 2));
      
      // 处理不同的响应格式
      let positions: any[] = [];
      if (Array.isArray(lockedPositions)) {
        positions = lockedPositions;
      } else if (Array.isArray(lockedPositions?.rows)) {
        positions = lockedPositions.rows;
      } else if (lockedPositions?.data && Array.isArray(lockedPositions.data)) {
        positions = lockedPositions.data;
      } else if (typeof lockedPositions === 'object' && lockedPositions !== null) {
        // 可能是单个对象，尝试转换为数组
        positions = [lockedPositions];
      }
      
      console.log(`[Binance] Found ${positions.length} locked earn positions`);
      
      if (positions.length > 0) {
        for (const position of positions) {
          const totalAmount = position.totalAmount || position.totalAmountInUSDT || position.amount;
          if (totalAmount && parseFloat(totalAmount) > 0) {
            const amount = parseFloat(totalAmount);
            const symbol = position.asset || 
                          position.projectId?.split('_')[0] || 
                          position.projectId?.replace(/.*_/, '') ||
                          'UNKNOWN';
            
            console.log(`[Binance] Adding locked earn asset: ${symbol}, amount: ${amount}`);
            
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
      console.error('[Binance] Failed to fetch locked earn positions:', e.message, e);
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
  
  console.log(`[Binance] ===== Total earn assets found: ${earnAssets.length} =====`);
  if (earnAssets.length > 0) {
    console.log('[Binance] Earn assets details:');
    earnAssets.forEach((asset, index) => {
      console.log(`[Binance]   ${index + 1}. ${asset.symbol}: ${asset.amount} (price: ${asset.price}, valueUsd: ${asset.valueUsd}, source: ${asset.source})`);
    });
  } else {
    console.warn('[Binance] WARNING: No earn assets found!');
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
  
  // 验证 passphrase 是否存在
  if (!passphrase || passphrase.trim() === '') {
    throw new Error('OKX Passphrase is required but not provided. Please set the API Passphrase in settings.');
  }
  
  // OKX API 要求：Passphrase 需要使用 Secret Key 进行 HMAC-SHA256 Base64 加密
  // 但根据最新文档，某些情况下可以直接使用原始 passphrase
  // 我们先尝试直接使用，如果失败再尝试加密
  const message = timestamp + method + endpoint + body;
  const signature = await hmacSha256Base64(secret, message);
  
  // 根据 OKX 文档，Passphrase 可能需要加密，但通常直接使用即可
  // 如果遇到 50105 错误，说明 Passphrase 不正确或需要加密
  const passphraseToUse = passphrase.trim();
  
  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphraseToUse,
    'Content-Type': 'application/json',
  };
  
  console.log(`[OKX] Making ${method} request to ${endpoint}`);
  console.log(`[OKX] Passphrase provided: ${!!passphraseToUse}, length: ${passphraseToUse.length}`);
  
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
    let errorData: any = {};
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      // 忽略解析错误
    }
    
    // 如果是 50105 错误（Passphrase 不正确），提供更详细的错误信息
    if (errorData.code === '50105' || errorText.includes('50105')) {
      console.error(`[OKX] Passphrase error (50105):`, {
        endpoint,
        method,
        apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
        passphraseLength: passphraseToUse.length,
        passphraseFirstChar: passphraseToUse ? passphraseToUse[0] : 'none',
        error: errorText,
      });
      throw new Error(`OKX_PASSPHRASE_ERROR: OKX API Passphrase 不正确 (错误代码: 50105)。请检查设置中的 Passphrase 是否与创建 API Key 时设置的完全一致（区分大小写）。`);
    }
    
    console.error(`[OKX] API error ${response.status}:`, errorText);
    console.error(`[OKX] Request details:`, {
      endpoint,
      method,
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
      passphraseLength: passphraseToUse.length,
      timestamp,
    });
    throw new Error(`OKX API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  if (data.code !== '0') {
    // 如果是 50105 错误，提供更详细的错误信息
    if (data.code === '50105') {
      console.error(`[OKX] Passphrase error (50105):`, {
        endpoint,
        method,
        apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
        passphraseLength: passphraseToUse.length,
        error: data,
      });
      throw new Error(`OKX_PASSPHRASE_ERROR: OKX API Passphrase 不正确 (错误代码: 50105)。请检查设置中的 Passphrase 是否与创建 API Key 时设置的完全一致（区分大小写）。`);
    }
    
    console.error(`[OKX] API returned error code:`, data);
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
    // 过滤掉已有价格的币种，并转换为交易对格式
    // 注意：某些币种可能不是有效的币安交易对，需要逐个尝试
    const symbolsToFetch = symbols
      .filter(s => !prices[s] && s.trim() !== '')
      .map(s => `${s.trim()}USDT`)
      .filter(s => s !== 'USDTUSDT'); // 避免 USDT/USDT
    
    if (symbolsToFetch.length === 0) return prices;
    
    // 分批请求，避免无效交易对导致整个请求失败
    // 币安 ticker API 支持批量查询，但如果有无效交易对会返回 400
    // 我们尝试分批请求，或者逐个请求
    const validSymbols: string[] = [];
    const invalidSymbols: string[] = [];
    
    // 先尝试批量请求
    try {
      const symbolsArray = symbolsToFetch.map(s => `"${s}"`).join(',');
      const url = `https://api.binance.com/api/v3/ticker/price?symbols=[${symbolsArray}]`;
      
      console.log('[Binance] Fetching prices for:', symbolsToFetch);
      console.log('[Binance] Price API URL:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        if (Array.isArray(data)) {
          for (const ticker of data) {
            if (ticker.symbol && ticker.price) {
              const baseSymbol = ticker.symbol.replace('USDT', '');
              prices[baseSymbol] = parseFloat(ticker.price);
              validSymbols.push(baseSymbol);
              console.log(`[Binance] Price for ${baseSymbol}: ${prices[baseSymbol]}`);
            }
          }
        } else {
          console.warn('[Binance] Unexpected price API response format:', data);
        }
      } else {
        // 如果批量请求失败，尝试逐个请求
        console.warn('[Binance] Batch price request failed, trying individual requests...');
        const errorText = await response.text();
        console.error(`[Binance] Price API error: ${response.status} ${response.statusText}`, errorText);
        
        // 逐个请求每个交易对
        for (const symbolPair of symbolsToFetch) {
          try {
            const singleUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${symbolPair}`;
            const singleResponse = await fetch(singleUrl);
            
            if (singleResponse.ok) {
              const singleData = await singleResponse.json();
              if (singleData.symbol && singleData.price) {
                const baseSymbol = singleData.symbol.replace('USDT', '');
                prices[baseSymbol] = parseFloat(singleData.price);
                validSymbols.push(baseSymbol);
                console.log(`[Binance] Price for ${baseSymbol}: ${prices[baseSymbol]}`);
              }
            } else {
              invalidSymbols.push(symbolPair);
              console.warn(`[Binance] Invalid symbol: ${symbolPair}`);
            }
          } catch (e) {
            invalidSymbols.push(symbolPair);
            console.warn(`[Binance] Failed to fetch price for ${symbolPair}:`, e);
          }
        }
      }
    } catch (e: any) {
      console.error('[Binance] Failed to fetch prices:', e.message, e);
      // 如果批量请求失败，尝试逐个请求
      for (const symbolPair of symbolsToFetch) {
        try {
          const singleUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${symbolPair}`;
          const singleResponse = await fetch(singleUrl);
          
          if (singleResponse.ok) {
            const singleData = await singleResponse.json();
            if (singleData.symbol && singleData.price) {
              const baseSymbol = singleData.symbol.replace('USDT', '');
              prices[baseSymbol] = parseFloat(singleData.price);
              validSymbols.push(baseSymbol);
              console.log(`[Binance] Price for ${baseSymbol}: ${prices[baseSymbol]}`);
            }
          }
        } catch (e) {
          // 忽略单个请求失败
        }
      }
    }
    
    if (invalidSymbols.length > 0) {
      console.warn(`[Binance] Invalid symbols (will try DeFiLlama later):`, invalidSymbols);
    }
  } catch (e: any) {
    console.error('[Binance] Failed to fetch prices:', e.message, e);
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
    console.log('[Binance] Fetching spot balance...');
    const spotAssets = await fetchBinanceSpotBalance(apiKey, secret);
    console.log(`[Binance] Found ${spotAssets.length} spot assets`);
    assets.push(...spotAssets);
    
    // 获取理财资产
    console.log('[Binance] ===== Fetching earn assets =====');
    const earnAssets = await fetchBinanceEarnAssets(apiKey, secret);
    console.log(`[Binance] ===== Earn assets returned: ${earnAssets.length} =====`);
    if (earnAssets.length > 0) {
      console.log('[Binance] Earn assets before adding:', earnAssets.map(a => `${a.symbol}: ${a.amount}`).join(', '));
    }
    assets.push(...earnAssets);
    console.log(`[Binance] Total assets after adding earn assets: ${assets.length}`);
    
    // 收集所有币种用于价格查询
    assets.forEach(asset => {
      // 从 "BTC (灵活赚币)" 或 "ETH (灵活赚币)" 提取 "BTC" 或 "ETH"
      const baseSymbol = asset.symbol.split(' ')[0].trim();
      if (asset.amount > 0 && baseSymbol && !symbolsToCheck.includes(baseSymbol)) {
        symbolsToCheck.push(baseSymbol);
      }
    });
    
    console.log(`[Binance] Symbols to fetch prices for:`, symbolsToCheck);
    
    // 获取价格
    const prices = await fetchBinancePrices(symbolsToCheck);
    
    console.log(`[Binance] Fetched prices:`, prices);
    
    // 更新资产价格
    assets.forEach(asset => {
      const baseSymbol = asset.symbol.split(' ')[0].trim();
      const price = prices[baseSymbol] || 0;
      asset.price = price;
      asset.valueUsd = asset.amount * price;
      if (price === 0 && asset.amount > 0) {
        console.warn(`[Binance] No price found for ${baseSymbol} (symbol: ${asset.symbol}, amount: ${asset.amount})`);
      }
    });
    
  } else if (type === 'okx') {
    // 验证 OKX 必需的 passphrase
    if (!password || password.trim() === '') {
      throw new Error('OKX requires Passphrase (API Passphrase). Please set it in settings. The Passphrase must match exactly what you set when creating the API key (case-sensitive).');
    }
    
    console.log('[OKX] ===== Fetching OKX assets =====');
    console.log('[OKX] Passphrase provided:', password ? 'Yes' : 'No', password ? `(length: ${password.length})` : '');
    
    // 获取资金账号资产
    try {
      console.log('[OKX] Fetching funding account assets...');
      const fundingAssets = await fetchOKXFundingAssets(
        apiKey,
        secret,
        password.trim()
      );
      console.log(`[OKX] Found ${fundingAssets.length} funding assets`);
      assets.push(...fundingAssets);
    } catch (e: any) {
      console.error('[OKX] Failed to fetch funding assets:', e.message);
      // 不阻断，继续尝试获取交易账号资产
    }
    
    // 获取交易账号资产
    try {
      console.log('[OKX] Fetching trading account assets...');
      const tradingAssets = await fetchOKXTradingAssets(
        apiKey,
        secret,
        password.trim()
      );
      console.log(`[OKX] Found ${tradingAssets.length} trading assets`);
      assets.push(...tradingAssets);
    } catch (e: any) {
      console.error('[OKX] Failed to fetch trading assets:', e.message);
      // 如果两个都失败，抛出错误
      if (assets.length === 0) {
        throw e;
      }
    }
    
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
  
  // 回退到 CryptoCompare - 处理带括号的符号（如 "ETH (灵活赚币)"）
  const missingAssets = coinsToFetch.filter(a => {
    // 提取基础符号（去掉括号和描述）
    const baseSymbol = a.symbol.split(' ')[0].trim();
    return !prices[a.symbol] && !prices[baseSymbol];
  });
  
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
      // 添加币安赚币资产的映射
      'ETH (灵活赚币)': 'ETH',
      'ETH (锁定赚币)': 'ETH',
      'ETH (活期质押)': 'ETH',
      'BTC (灵活赚币)': 'BTC',
      'BTC (锁定赚币)': 'BTC',
    };
    
    // 对于没有映射的符号，提取基础符号（去掉括号部分）
    const fetchSymbols = symbols.map(s => {
      if (symbolMapping[s]) {
        return symbolMapping[s];
      }
      // 提取基础符号：从 "ETH (灵活赚币)" 提取 "ETH"
      const baseSymbol = s.split(' ')[0].trim();
      return baseSymbol.toUpperCase();
    });
    
    if (fetchSymbols.length > 0) {
      try {
        const fsyms = fetchSymbols.join(',');
        const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms}&tsyms=USD`;
        const res = await fetch(url);
        const data = await res.json();
        
        for (const symbol of symbols) {
          let fetchKey: string;
          if (symbolMapping[symbol]) {
            fetchKey = symbolMapping[symbol];
          } else {
            // 提取基础符号
            fetchKey = symbol.split(' ')[0].trim().toUpperCase();
          }
          
          if (data[fetchKey] && data[fetchKey].USD) {
            prices[symbol] = data[fetchKey].USD;
            // 同时设置基础符号的价格，以便其他资产也能使用
            const baseSymbol = symbol.split(' ')[0].trim();
            if (!prices[baseSymbol]) {
              prices[baseSymbol] = data[fetchKey].USD;
            }
            console.log(`[Prices] Found price for ${symbol} (${fetchKey}): $${prices[symbol]}`);
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

