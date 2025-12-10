import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // We now expect an array of asset objects: { symbol, chainName, contractAddress }
    const { assets } = await request.json();

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    const prices: Record<string, number> = {};
    
    // 1. Separate assets into stablecoins (hardcoded) and others (fetch)
    const stablecoins = ['USDT', 'USDC', 'DAI', 'FDUSD', 'BUSD'];
    const coinsToFetch: any[] = [];

    for (const asset of assets) {
        if (stablecoins.includes(asset.symbol) && asset.price === 0) {
            prices[asset.symbol] = 1;
        } else {
            coinsToFetch.push(asset);
        }
    }

    // 2. Prepare DeFiLlama query
    const llamaIds = coinsToFetch
        .filter(a => a.chainName && a.contractAddress)
        .map(a => {
            if (a.contractAddress === '0x0000000000000000000000000000000000000000') {
                return null; 
            }
            return `${a.chainName}:${a.contractAddress}`;
        })
        .filter(id => id !== null);

    // 3. Fetch from DeFiLlama
    if (llamaIds.length > 0) {
        try {
            const idsParam = llamaIds.join(',');
            const response = await fetch(`https://coins.llama.fi/prices/current/${idsParam}`);
            const data = await response.json();
            
            if (data.coins) {
                for (const asset of coinsToFetch) {
                    const id = `${asset.chainName}:${asset.contractAddress}`;
                    if (data.coins[id]) {
                        prices[asset.symbol] = data.coins[id].price;
                    }
                }
            }
        } catch (e) {
            console.error("DeFiLlama API error", e);
        }
    }

    // 4. Fallback for Native Tokens or missing ones (using CryptoCompare by symbol)
    // Filter assets that still have no price
    const missingAssets = coinsToFetch.filter(a => !prices[a.symbol]);
    
    if (missingAssets.length > 0) {
        const symbols = Array.from(new Set(missingAssets.map(a => a.symbol)));
        
        // Map special symbols for CryptoCompare
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

    return NextResponse.json({ prices });
  } catch (error: any) {
    console.error('Price API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
