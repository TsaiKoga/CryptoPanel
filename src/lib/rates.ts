export interface MarketRates {
  btcPrice: number;
  usdToCny: number;
}

export const DEFAULT_USD_TO_CNY = 7.2;

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function trySources(sources: Array<() => Promise<number>>): Promise<number> {
  for (const source of sources) {
    try {
      const value = await source();
      if (value > 0) return value;
    } catch {
      /* try next */
    }
  }
  return 0;
}

export async function fetchBtcPriceUsd(fetchImpl: FetchImpl = fetch): Promise<number> {
  return trySources([
    async () => {
      const res = await fetchImpl('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      if (!res.ok) return 0;
      const data = (await res.json()) as { price?: string };
      return parseFloat(data.price ?? '0') || 0;
    },
    async () => {
      const res = await fetchImpl(
        'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT'
      );
      if (!res.ok) return 0;
      const data = (await res.json()) as {
        code?: string;
        data?: Array<{ last?: string }>;
      };
      if (data.code !== '0' || !data.data?.[0]?.last) return 0;
      return parseFloat(data.data[0].last) || 0;
    },
    async () => {
      const res = await fetchImpl(
        'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD'
      );
      if (!res.ok) return 0;
      const data = (await res.json()) as { USD?: number };
      return data.USD || 0;
    },
    async () => {
      const res = await fetchImpl(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
      );
      if (!res.ok) return 0;
      const data = (await res.json()) as { bitcoin?: { usd?: number } };
      return data.bitcoin?.usd || 0;
    },
  ]);
}

export async function fetchUsdToCnyRate(fetchImpl: FetchImpl = fetch): Promise<number> {
  const rate = await trySources([
    async () => {
      const res = await fetchImpl('https://api.exchangerate-api.com/v4/latest/USD');
      if (!res.ok) return 0;
      const data = (await res.json()) as { rates?: { CNY?: number } };
      return data.rates?.CNY || 0;
    },
    async () => {
      const res = await fetchImpl(
        'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=cny'
      );
      if (!res.ok) return 0;
      const data = (await res.json()) as { usd?: { cny?: number } };
      return data.usd?.cny || 0;
    },
  ]);
  return rate > 0 ? rate : DEFAULT_USD_TO_CNY;
}

export async function fetchMarketRates(fetchImpl: FetchImpl = fetch): Promise<MarketRates> {
  const [btcPrice, usdToCny] = await Promise.all([
    fetchBtcPriceUsd(fetchImpl),
    fetchUsdToCnyRate(fetchImpl),
  ]);
  return { btcPrice, usdToCny };
}
