import { Asset } from '@/types';
import { assetBaseSymbol } from '@/lib/asset-display';

const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

const STABLECOINS = new Set(['USDT', 'USDC', 'DAI', 'FDUSD', 'BUSD']);

const BINANCE_USDT_PAIRS: Record<string, string> = {
  ETH: 'ETHUSDT',
  BTC: 'BTCUSDT',
  BNB: 'BNBUSDT',
  MATIC: 'MATICUSDT',
  AVAX: 'AVAXUSDT',
  SOL: 'SOLUSDT',
  ARB: 'ARBUSDT',
  OP: 'OPUSDT',
  PLUME: 'PLUMEUSDT',
  BERA: 'BERAUSDT',
};

const SYMBOL_MAPPING: Record<string, string> = {
  'stETH (Eigen)': 'STETH',
  'rETH (Eigen)': 'RETH',
  'cbETH (Eigen)': 'CBETH',
  'WETH (Eigen)': 'ETH',
  'swETH (Eigen)': 'SWETH',
  WETH: 'ETH',
  'WETH.e': 'ETH',
  ZK: 'ZK',
  XDOG: 'XDOG',
  cbBTC: 'BTC',
  'BTC.b': 'BTC',
  USDBc: 'USDC',
  TOSHI: 'TOSHI',
  ZRO: 'ZRO',
  ZORA: 'ZORA',
  VIRTUAL: 'VIRTUAL',
  CASHCAT: 'CASHCAT',
  JTO: 'JTO',
  BONK: 'BONK',
  WIF: 'WIF',
  SKR: 'SKR',
  JitoSOL: 'JITOSOL',
  mSOL: 'MSOL',
  RAY: 'RAY',
  JUP: 'JUP',
  PYTH: 'PYTH',
  'ETH (简单赚币)': 'ETH',
  'BTC (简单赚币)': 'BTC',
  'ETH (链上赚币)': 'ETH',
  'BTC (链上赚币)': 'BTC',
  'ETH (灵活赚币)': 'ETH',
  'ETH (锁定赚币)': 'ETH',
  'BTC (灵活赚币)': 'BTC',
  'BTC (锁定赚币)': 'BTC',
};

const STRATEGY_TO_TOKEN: Record<string, string> = {
  '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6': '0xf951E335afb289353dc249e82926178EaC7DEd78',
  '0x2aebba35224c4f82922162765b46febd8dfe1e14': '0xf951E335afb289353dc249e82926178EaC7DEd78',
};

/** DeFiLlama chain-native 0x0 id can return wrong coin (e.g. plume → ETH) */
const NATIVE_LLAMA_ID_OVERRIDE: Record<string, string> = {
  plume: 'coingecko:plume',
};

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function priceFetchKey(symbol: string): string {
  return SYMBOL_MAPPING[symbol] ?? assetBaseSymbol(symbol);
}

function isNativeAsset(asset: Asset): boolean {
  return asset.contractAddress?.toLowerCase() === NATIVE_TOKEN_ADDRESS;
}

function acceptLlamaPrice(asset: Asset, coin: { symbol?: string; price?: number }): number {
  if (!coin.price || coin.price <= 0) return 0;
  if (isNativeAsset(asset)) {
    const expected = assetBaseSymbol(asset.symbol);
    const returned = (coin.symbol ?? '').toUpperCase();
    if (returned && returned !== expected) {
      console.warn(
        `[Prices] DeFiLlama symbol mismatch for ${asset.symbol} (${asset.chainName}): got ${returned}`
      );
      return 0;
    }
  }
  return coin.price;
}

function setPrice(prices: Record<string, number>, symbol: string, price: number): void {
  if (price <= 0) return;
  prices[symbol] = price;
  const base = assetBaseSymbol(symbol);
  if (!prices[base]) prices[base] = price;
}

async function fetchBinanceUsdPrice(symbol: string, fetchImpl: FetchImpl): Promise<number> {
  const pair = BINANCE_USDT_PAIRS[symbol.toUpperCase()];
  if (!pair) return 0;
  try {
    const res = await fetchImpl(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    if (!res.ok) return 0;
    const data = (await res.json()) as { price?: string };
    return parseFloat(data.price ?? '0') || 0;
  } catch {
    return 0;
  }
}

async function fetchOkxUsdPrice(instId: string, fetchImpl: FetchImpl): Promise<number> {
  try {
    const res = await fetchImpl(
      `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(instId)}`
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      code?: string;
      data?: Array<{ last?: string }>;
    };
    if (data.code !== '0' || !data.data?.[0]?.last) return 0;
    return parseFloat(data.data[0].last) || 0;
  } catch {
    return 0;
  }
}

async function fetchSymbolUsdPrice(symbol: string, fetchImpl: FetchImpl): Promise<number> {
  const key = priceFetchKey(symbol);
  const fromBinance = await fetchBinanceUsdPrice(key, fetchImpl);
  if (fromBinance > 0) return fromBinance;

  if (key === 'ETH') return fetchOkxUsdPrice('ETH-USDT', fetchImpl);
  if (key === 'BTC') return fetchOkxUsdPrice('BTC-USDT', fetchImpl);
  if (key === 'PLUME') return fetchOkxUsdPrice('PLUME-USDT', fetchImpl);

  return 0;
}

function buildLlamaId(asset: Asset): string | null {
  if (!asset.chainName || !asset.contractAddress) return null;
  if (asset.chainName === 'coingecko') {
    return `coingecko:${asset.contractAddress}`;
  }
  if (isNativeAsset(asset) && NATIVE_LLAMA_ID_OVERRIDE[asset.chainName]) {
    return NATIVE_LLAMA_ID_OVERRIDE[asset.chainName];
  }
  const tokenAddress =
    STRATEGY_TO_TOKEN[asset.contractAddress.toLowerCase()] ?? asset.contractAddress;
  return `${asset.chainName}:${tokenAddress}`;
}

/** Shared price lookup for wallet + CEX assets (Web API + extension background). */
export async function fetchPricesForAssets(
  assets: Asset[],
  fetchImpl: FetchImpl = fetch
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const coinsToFetch: Asset[] = [];

  for (const asset of assets) {
    const base = assetBaseSymbol(asset.symbol);
    if (STABLECOINS.has(base) && asset.price === 0) {
      setPrice(prices, asset.symbol, 1);
    } else {
      coinsToFetch.push(asset);
    }
  }

  const llamaIds = [
    ...new Set(
      coinsToFetch.map(buildLlamaId).filter((id): id is string => Boolean(id))
    ),
  ];

  if (llamaIds.length > 0) {
    try {
      const response = await fetchImpl(
        `https://coins.llama.fi/prices/current/${llamaIds.join(',')}`
      );
      const data = (await response.json()) as {
        coins?: Record<string, { price?: number }>;
      };
      if (data.coins) {
        for (const asset of coinsToFetch) {
          const id = buildLlamaId(asset);
          if (!id || !data.coins[id]) continue;
          const price = acceptLlamaPrice(asset, data.coins[id]);
          if (price > 0) setPrice(prices, asset.symbol, price);
        }
      }
    } catch (e) {
      console.error('[Prices] DeFiLlama error', e);
    }
  }

  const missing = coinsToFetch.filter((a) => {
    const base = assetBaseSymbol(a.symbol);
    return !prices[a.symbol] && !prices[base];
  });

  if (missing.length > 0) {
    const symbols = [...new Set(missing.map((a) => a.symbol))];
    const fetchKeys = [...new Set(symbols.map(priceFetchKey))];

    try {
      const fsyms = fetchKeys.join(',');
      const res = await fetchImpl(
        `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms}&tsyms=USD`
      );
      if (res.ok) {
        const data = (await res.json()) as Record<string, { USD?: number }>;
        for (const symbol of symbols) {
          const key = priceFetchKey(symbol);
          if (data[key]?.USD) setPrice(prices, symbol, data[key].USD!);
        }
      }
    } catch {
      /* fall through to exchange API */
    }

    for (const symbol of symbols) {
      const base = assetBaseSymbol(symbol);
      if (prices[symbol] || prices[base]) continue;
      const price = await fetchSymbolUsdPrice(symbol, fetchImpl);
      if (price > 0) setPrice(prices, symbol, price);
    }
  }

  return prices;
}

export { NATIVE_TOKEN_ADDRESS };
