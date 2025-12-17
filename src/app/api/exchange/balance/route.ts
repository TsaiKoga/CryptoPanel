import { NextResponse } from 'next/server';
import ccxt from 'ccxt';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodeFetch from 'node-fetch';
import { Asset } from '@/types';
import crypto from 'crypto';

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

export async function POST(request: Request) {
  try {
    const { type, apiKey, secret, password } = await request.json();

    if (!type || !apiKey || !secret) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    let exchange;
    const config: any = {
        apiKey,
        secret,
        password, // For OKX
        enableRateLimit: true,
        timeout: 30000,
        options: {
            'defaultType': 'spot', 
        },
        // Force usage of node-fetch which works better with http.Agent proxies than native fetch
        fetchImplementation: nodeFetch 
    };

    // Setup proxy if environment variable is set
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
    if (proxyUrl) {
        console.log(`[API] Using proxy for CCXT: ${proxyUrl}`);
        try {
            config.agent = new HttpsProxyAgent(proxyUrl);
        } catch (e) {
            console.error(`[API] Failed to create proxy agent:`, e);
        }
    } else {
        console.log(`[API] No proxy environment variable found (HTTP_PROXY/HTTPS_PROXY)`);
    }

    if (type === 'binance') {
      exchange = new ccxt.binance(config);
    } else if (type === 'okx') {
      exchange = new ccxt.okx(config);
    } else {
      return NextResponse.json({ error: 'Unsupported exchange' }, { status: 400 });
    }

    // Fetch balance
    console.log(`[API] Fetching balance for ${type}...`);
    const balance = await exchange.fetchBalance();
    console.log(`[API] Balance fetched successfully`);
    
    const items = balance.total as Record<string, number>;
    if (!items) {
         return NextResponse.json({ assets: [] });
    }

    const assets: Asset[] = [];
    const symbolsToCheck: string[] = [];
    
    // Filter non-zero assets
    for (const [symbol, amount] of Object.entries(items)) {
      if (amount && amount > 0) {
        symbolsToCheck.push(symbol);
      }
    }

    // Separate Price Fetching Logic
    const prices: Record<string, number> = {
        'USDT': 1,
        'USDC': 1,
        'DAI': 1,
        'FDUSD': 1,
        'BUSD': 1
    };
    
    const pairsToFetch = symbolsToCheck
        .filter(s => !prices[s])
        .map(s => `${s}/USDT`);

    if (pairsToFetch.length > 0) {
        try {
            const tickers = await exchange.fetchTickers(pairsToFetch);
            for (const [symbol, ticker] of Object.entries(tickers)) {
                if (ticker && ticker.last !== undefined) {
                    const base = symbol.split('/')[0];
                    prices[base] = ticker.last;
                }
            }
        } catch (e) {
            console.warn("CCXT Price fetch failed, continuing with 0 price", e);
        }
    }

    for (const symbol of symbolsToCheck) {
        const amount = items[symbol];
        const price = prices[symbol] || 0;
        const valueUsd = amount * price;
        
        assets.push({
            symbol,
            amount,
            price,
            valueUsd,
            source: type === 'binance' ? 'Binance' : 'OKX',
            type: 'cex'
        });
    }
    
    // 获取币安理财资产
    if (type === 'binance') {
      try {
        const earnAssets = await fetchBinanceEarnAssets(
          apiKey,
          secret,
          config.agent
        );
        
        // 为理财资产获取价格
        const earnSymbols = earnAssets.map(a => {
          // 从 "BTC (灵活赚币)" 提取 "BTC"
          const match = a.symbol.match(/^([A-Z0-9]+)\s*\(/);
          return match ? match[1] : a.symbol;
        });
        
        const earnPairsToFetch = earnSymbols
          .filter(s => !prices[s])
          .map(s => `${s}/USDT`);
        
        if (earnPairsToFetch.length > 0) {
          try {
            const tickers = await exchange.fetchTickers(earnPairsToFetch);
            for (const [symbol, ticker] of Object.entries(tickers)) {
              if (ticker && ticker.last !== undefined) {
                const base = symbol.split('/')[0];
                prices[base] = ticker.last;
              }
            }
          } catch (e) {
            console.warn("Failed to fetch prices for earn assets", e);
          }
        }
        
        // 更新理财资产的价格和 USD 价值
        earnAssets.forEach(asset => {
          const match = asset.symbol.match(/^([A-Z0-9]+)\s*\(/);
          const baseSymbol = match ? match[1] : asset.symbol;
          const price = prices[baseSymbol] || 0;
          asset.price = price;
          asset.valueUsd = asset.amount * price;
        });
        
        assets.push(...earnAssets);
      } catch (e: any) {
        console.warn('[Binance] Failed to fetch earn assets:', e.message);
        // 不阻断主流程，继续返回现货资产
      }
    }
    
    assets.sort((a, b) => b.valueUsd - a.valueUsd);

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error('Exchange API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance', details: error.toString() },
      { status: 500 }
    );
  }
}
