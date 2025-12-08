import { NextResponse } from 'next/server';
import ccxt from 'ccxt';
import { Asset } from '@/types';

export async function POST(request: Request) {
  try {
    const { type, apiKey, secret } = await request.json();

    if (!type || !apiKey || !secret) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    let exchange;
    const config = {
        apiKey,
        secret,
        enableRateLimit: true,
    };

    if (type === 'binance') {
      exchange = new ccxt.binance(config);
    } else if (type === 'okx') {
      exchange = new ccxt.okx(config);
    } else {
      return NextResponse.json({ error: 'Unsupported exchange' }, { status: 400 });
    }

    // Fetch balance
    // fetchBalance returns a dictionary with 'total', 'free', 'used'
    const balance = await exchange.fetchBalance();
    
    // Check if 'total' exists (it usually does)
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

    // Price fetching logic
    // We assume most assets have a USDT pair
    let prices: Record<string, number> = {
        'USDT': 1,
        'USDC': 1,
        'DAI': 1,
        'FDUSD': 1,
        'BUSD': 1
    };
    
    const validPairs = symbolsToCheck
        .filter(s => !prices[s]) // Exclude known stables
        .map(s => `${s}/USDT`);

    if (validPairs.length > 0) {
        try {
            // fetchTickers is supported by Binance and OKX
            // Note: If a pair doesn't exist, some exchanges might error partially or fully.
            // Safe bet: Fetch all tickers (no args) is safer but heavier.
            // Let's try fetching specific tickers first.
            // If it fails, we might just fetch all.
            
            // However, passing a large list of symbols might be rejected or slow.
            // Optimization: Only fetch for top assets or batch it. 
            // For personal portfolios, usually < 50 assets. It should be fine.
            
            const tickers = await exchange.fetchTickers(validPairs);
            
            for (const [symbol, ticker] of Object.entries(tickers)) {
                if (ticker && ticker.last !== undefined) {
                    const base = symbol.split('/')[0];
                    prices[base] = ticker.last;
                }
            }
        } catch (e) {
            console.warn("Error fetching specific tickers, falling back to all tickers or skipping price", e);
            // Fallback: Try fetching all tickers? Or just accept 0 price.
            // For now, let's just log.
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
    
    // Sort by value descending
    assets.sort((a, b) => b.valueUsd - a.valueUsd);

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error('Exchange API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}

