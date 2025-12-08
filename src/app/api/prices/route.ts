import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    // Handle stablecoins
    const prices: Record<string, number> = {
        'USDT': 1,
        'USDC': 1,
        'DAI': 1,
        'FDUSD': 1,
        'BUSD': 1,
        // Map EigenLayer assets to their underlying price approximately
        'stETH (Eigen)': 0, // Placeholder, will fetch stETH
        'rETH (Eigen)': 0,
        'cbETH (Eigen)': 0,
        'WETH (Eigen)': 0,
        'swETH (Eigen)': 0,
    };

    // Map special symbols to fetchable ones
    const symbolMapping: Record<string, string> = {
        'stETH (Eigen)': 'STETH',
        'rETH (Eigen)': 'RETH',
        'cbETH (Eigen)': 'CBETH',
        'WETH (Eigen)': 'ETH',
        'swETH (Eigen)': 'SWETH',
        'WETH': 'ETH',
        'ZK': 'ZK',
        'XDOG': 'XDOG'
    };

    const symbolsToFetch = symbols
        .map((s: string) => symbolMapping[s] || s)
        .filter((s: string) => !prices[s]);

    if (symbolsToFetch.length > 0) {
        try {
            // Use CryptoCompare API which is more accessible and supports symbol-based querying
            // Limit is roughly 300 chars for URL params, so we might need to batch if many symbols
            // For personal use < 20 symbols usually.
            const fsyms = symbolsToFetch.join(',');
            const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms}&tsyms=USD`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`CryptoCompare API error: ${response.statusText}`);
            }
            
            const data = await response.json();
            // Response format: { "ETH": { "USD": 2200.5 }, "BTC": { "USD": 43000 } }
            
            for (const symbol of symbols) {
                // Determine the fetch key (e.g. "stETH (Eigen)" -> "STETH")
                const fetchKey = (symbolMapping[symbol] || symbol).toUpperCase();
                
                if (data[fetchKey] && data[fetchKey].USD) {
                    prices[symbol] = data[fetchKey].USD;
                }
            }
        } catch (e) {
            console.error("Price fetch error with CryptoCompare", e);
        }
    }

    return NextResponse.json({ prices });
  } catch (error: any) {
    console.error('Price API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
