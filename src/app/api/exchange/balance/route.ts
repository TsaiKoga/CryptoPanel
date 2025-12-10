import { NextResponse } from 'next/server';
import ccxt from 'ccxt';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodeFetch from 'node-fetch';
import { Asset } from '@/types';

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
