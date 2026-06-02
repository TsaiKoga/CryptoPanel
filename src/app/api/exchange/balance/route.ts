import { NextResponse } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodeFetch from 'node-fetch';
import { Asset } from '@/types';
import crypto from 'crypto';

function createProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy ||
    process.env.ALL_PROXY;

  if (!proxyUrl) {
    console.log('[API] No proxy environment variable found (HTTP_PROXY/HTTPS_PROXY)');
    return undefined;
  }

  console.log(`[API] Using proxy: ${proxyUrl}`);
  try {
    return new HttpsProxyAgent(proxyUrl);
  } catch (e) {
    console.error('[API] Failed to create proxy agent:', e);
    return undefined;
  }
}

function networkErrorHint(message: string): string {
  if (message.includes('instanceof')) {
    return `${message}。请重启 npm run dev 以加载最新交易所 API（已移除 CCXT）。`;
  }
  if (
    message.includes('169.254.') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNREFUSED')
  ) {
    return `${message}。请在 .env.local 设置 HTTPS_PROXY（如 http://127.0.0.1:7890）后重启 npm run dev。`;
  }
  return message;
}

// 币安 API 签名辅助函数
async function binanceSignedRequest(
  endpoint: string,
  apiKey: string,
  secret: string,
  params: Record<string, any> = {},
  proxyAgent?: any
): Promise<any> {
  const baseUrl = 'https://api.binance.com';
  const timestamp = Date.now();
  
  // 构建查询参数
  const queryParams = new URLSearchParams({
    ...params,
    timestamp: timestamp.toString(),
  });
  
  // 生成签名
  const signature = crypto
    .createHmac('sha256', secret)
    .update(queryParams.toString())
    .digest('hex');
  
  queryParams.append('signature', signature);
  
  const url = `${baseUrl}${endpoint}?${queryParams.toString()}`;
  
  const fetchOptions: any = {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': apiKey,
    },
  };
  
  if (proxyAgent) {
    fetchOptions.agent = proxyAgent;
  }
  
  const response = await nodeFetch(url, fetchOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Binance API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

// 获取币安理财资产
async function fetchBinanceEarnAssets(
  apiKey: string,
  secret: string,
  proxyAgent?: any
): Promise<Asset[]> {
  const earnAssets: Asset[] = [];
  
  try {
    // 1. 获取灵活赚币持仓
    try {
      const flexibleData = await binanceSignedRequest(
        '/sapi/v1/simple-earn/flexible/position',
        apiKey,
        secret,
        {},
        proxyAgent
      );

      console.log('[Binance] Flexible earn response:', JSON.stringify(flexibleData, null, 2));

      // 官方文档：返回结构为 { total, rows: [...] }
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
            // 尝试多种方式获取币种符号
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
        {},
        proxyAgent
      );
      
      if (Array.isArray(lockedPositions)) {
        for (const position of lockedPositions) {
          const totalAmount = position.totalAmount || position.totalAmountInUSDT || position.amount;
          if (totalAmount && parseFloat(totalAmount) > 0) {
            const amount = parseFloat(totalAmount);
            // 尝试多种方式获取币种符号
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
    
    // 3. 获取质押持仓 - 尝试不同的产品类型
    const stakingProducts = ['STAKING', 'F_DEFI', 'L_DEFI'];
    for (const product of stakingProducts) {
      try {
        const stakingPositions = await binanceSignedRequest(
          '/sapi/v1/staking/position',
          apiKey,
          secret,
          { product },
          proxyAgent
        );
        
        console.log(`[Binance] ${product} staking positions response:`, JSON.stringify(stakingPositions, null, 2));
        
        if (Array.isArray(stakingPositions)) {
          for (const position of stakingPositions) {
            // 尝试多种可能的字段名
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
    
    // 4. 获取 ETH 质押账户（活期质押）
    try {
      const ethStakingAccount = await binanceSignedRequest(
        '/sapi/v2/eth-staking/account',
        apiKey,
        secret,
        {},
        proxyAgent
      );
      
      console.log('[Binance] ETH staking account response:', JSON.stringify(ethStakingAccount, null, 2));
      
      // ETH 质押账户可能返回不同的字段结构
      if (ethStakingAccount) {
        // 尝试多种可能的字段名
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
        
        // 检查是否有 WBETH（包装的质押ETH）
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
      // 输出详细错误信息以便调试
      if (e.message) {
        console.warn('[Binance] ETH staking error details:', e.message);
      }
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
  body: string = '',
  proxyAgent?: any
): Promise<any> {
  const baseUrl = 'https://www.okx.com';
  const timestamp = new Date().toISOString();
  
  // OKX 签名方式：timestamp + method + requestPath + body
  const message = timestamp + method + endpoint + body;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64');
  
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
  
  if (proxyAgent) {
    fetchOptions.agent = proxyAgent;
  }
  
  const response = await nodeFetch(url, fetchOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OKX API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // OKX API 返回格式：{ code: "0", msg: "", data: [...] }
  if (data.code !== '0') {
    throw new Error(`OKX API error: ${data.code} - ${data.msg || 'Unknown error'}`);
  }
  
  return data.data;
}

// 获取 OKX 资金账号资产
async function fetchOKXFundingAssets(
  apiKey: string,
  secret: string,
  passphrase: string,
  proxyAgent?: HttpsProxyAgent<string>
): Promise<Asset[]> {
  const assets: Asset[] = [];

  const fundingBalances = await okxSignedRequest(
    '/api/v5/asset/balances',
    'GET',
    apiKey,
    secret,
    passphrase,
    '',
    proxyAgent
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

  return assets;
}

// 获取 OKX 交易账号资产
async function fetchOKXTradingAssets(
  apiKey: string,
  secret: string,
  passphrase: string,
  proxyAgent?: HttpsProxyAgent<string>
): Promise<Asset[]> {
  const assets: Asset[] = [];

  const tradingBalance = await okxSignedRequest(
    '/api/v5/account/balance',
    'GET',
    apiKey,
    secret,
    passphrase,
    '',
    proxyAgent
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

  return assets;
}

async function fetchBinanceSpotBalance(
  apiKey: string,
  secret: string,
  proxyAgent?: HttpsProxyAgent<string>
): Promise<Asset[]> {
  const assets: Asset[] = [];
  const accountInfo = await binanceSignedRequest(
    '/api/v3/account',
    apiKey,
    secret,
    {},
    proxyAgent
  );

  if (accountInfo.balances && Array.isArray(accountInfo.balances)) {
    for (const balance of accountInfo.balances) {
      const amount =
        parseFloat(balance.free || '0') + parseFloat(balance.locked || '0');
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

  return assets;
}

async function fetchBinancePrices(
  symbols: string[],
  proxyAgent?: HttpsProxyAgent<string>
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {
    USDT: 1,
    USDC: 1,
    DAI: 1,
    FDUSD: 1,
    BUSD: 1,
  };

  const symbolsToFetch = symbols
    .filter((s) => !prices[s] && s.trim() !== '')
    .map((s) => `${s.trim()}USDT`)
    .filter((s) => s !== 'USDTUSDT');

  if (symbolsToFetch.length === 0) return prices;

  const fetchOptions: { agent?: HttpsProxyAgent<string> } = {};
  if (proxyAgent) fetchOptions.agent = proxyAgent;

  const applyTicker = (symbol: string, price: string) => {
    prices[symbol.replace('USDT', '')] = parseFloat(price);
  };

  try {
    const symbolsArray = symbolsToFetch.map((s) => `"${s}"`).join(',');
    const url = `https://api.binance.com/api/v3/ticker/price?symbols=[${symbolsArray}]`;
    const response = await nodeFetch(url, fetchOptions);
    if (response.ok) {
      const data = (await response.json()) as Array<{ symbol: string; price: string }>;
      if (Array.isArray(data)) {
        for (const ticker of data) {
          if (ticker.symbol && ticker.price) applyTicker(ticker.symbol, ticker.price);
        }
        return prices;
      }
    }
  } catch (e) {
    console.warn('[Binance] Batch price request failed:', e);
  }

  for (const symbolPair of symbolsToFetch) {
    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbolPair}`;
      const response = await nodeFetch(url, fetchOptions);
      if (response.ok) {
        const data = (await response.json()) as { symbol: string; price: string };
        if (data.symbol && data.price) applyTicker(data.symbol, data.price);
      }
    } catch {
      /* skip */
    }
  }

  return prices;
}

async function fetchOKXPrices(
  symbols: string[],
  proxyAgent?: HttpsProxyAgent<string>
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {
    USDT: 1,
    USDC: 1,
    DAI: 1,
    FDUSD: 1,
    BUSD: 1,
  };

  const symbolsParam = symbols
    .filter((s) => !prices[s])
    .map((s) => `${s}-USDT`)
    .join(',');

  if (!symbolsParam) return prices;

  const fetchOptions: { agent?: HttpsProxyAgent<string> } = {};
  if (proxyAgent) fetchOptions.agent = proxyAgent;

  const response = await nodeFetch(
    `https://www.okx.com/api/v5/market/tickers?instId=${symbolsParam}`,
    fetchOptions
  );

  if (response.ok) {
    const data = (await response.json()) as {
      code: string;
      data?: Array<{ instId: string; last: string }>;
    };
    if (data.code === '0' && Array.isArray(data.data)) {
      for (const ticker of data.data) {
        const baseSymbol = ticker.instId.split('-')[0];
        prices[baseSymbol] = parseFloat(ticker.last || '0');
      }
    }
  }

  return prices;
}

export async function POST(request: Request) {
  try {
    const { type, apiKey, secret, password } = await request.json();

    if (!type || !apiKey || !secret) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    if (type !== 'binance' && type !== 'okx') {
      return NextResponse.json({ error: 'Unsupported exchange' }, { status: 400 });
    }

    const proxyAgent = createProxyAgent();
    const assets: Asset[] = [];

    console.log(`[API] Fetching balance for ${type} (direct API, no CCXT)...`);

    if (type === 'binance') {
      const spotAssets = await fetchBinanceSpotBalance(apiKey, secret, proxyAgent);
      assets.push(...spotAssets);

      const earnAssets = await fetchBinanceEarnAssets(apiKey, secret, proxyAgent);
      assets.push(...earnAssets);

      const symbolsToCheck: string[] = [];
      assets.forEach((asset) => {
        const base = asset.symbol.split(' ')[0].trim();
        if (asset.amount > 0 && base && !symbolsToCheck.includes(base)) {
          symbolsToCheck.push(base);
        }
      });

      const prices = await fetchBinancePrices(symbolsToCheck, proxyAgent);
      assets.forEach((asset) => {
        const base = asset.symbol.split(' ')[0].trim();
        const price = prices[base] || 0;
        asset.price = price;
        asset.valueUsd = asset.amount * price;
      });
    } else {
      if (!password || !password.trim()) {
        return NextResponse.json(
          {
            error:
              'OKX 需要填写 Passphrase（与创建 API Key 时设置的完全一致，区分大小写）',
          },
          { status: 400 }
        );
      }

      const passphrase = password.trim();
      let okxError: string | undefined;

      try {
        assets.push(
          ...(await fetchOKXFundingAssets(apiKey, secret, passphrase, proxyAgent))
        );
      } catch (e: unknown) {
        okxError = e instanceof Error ? e.message : String(e);
        console.error('[OKX] Failed to fetch funding account:', okxError);
      }

      try {
        assets.push(
          ...(await fetchOKXTradingAssets(apiKey, secret, passphrase, proxyAgent))
        );
      } catch (e: unknown) {
        okxError = e instanceof Error ? e.message : String(e);
        console.error('[OKX] Failed to fetch trading account:', okxError);
      }

      if (assets.length === 0) {
        throw new Error(
          networkErrorHint(
            okxError || '无法获取 OKX 余额，请检查 API Key、Passphrase 与网络/代理'
          )
        );
      }

      const symbolsToCheck: string[] = [];
      assets.forEach((asset) => {
        if (asset.amount > 0 && !symbolsToCheck.includes(asset.symbol)) {
          symbolsToCheck.push(asset.symbol);
        }
      });

      const prices = await fetchOKXPrices(symbolsToCheck, proxyAgent);
      assets.forEach((asset) => {
        const price = prices[asset.symbol] || 0;
        asset.price = price;
        asset.valueUsd = asset.amount * price;
      });
    }

    assets.sort((a, b) => b.valueUsd - a.valueUsd);

    return NextResponse.json({ assets });
  } catch (error: unknown) {
    console.error('Exchange API Error:', error);
    const message = networkErrorHint(
      error instanceof Error ? error.message : 'Failed to fetch balance'
    );
    return NextResponse.json(
      { error: message, details: String(error) },
      { status: 500 }
    );
  }
}
