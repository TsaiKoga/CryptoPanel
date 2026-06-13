import { Asset } from '@/types';

function normalizeAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

function baseSymbol(symbol: string): string {
  return symbol.split(' ')[0].trim().toUpperCase();
}

export const OKX_SOURCE_FUNDING = 'OKX - 资金账号';
export const OKX_SOURCE_TRADING = 'OKX - 交易账号';
export const OKX_SOURCE_SIMPLE_EARN = 'OKX - 简单赚币';
export const OKX_SOURCE_STAKING = 'OKX - 链上赚币';

export function isOkxSpotRow(asset: Asset): boolean {
  return (
    asset.source === OKX_SOURCE_FUNDING ||
    asset.source === OKX_SOURCE_TRADING ||
    asset.source.includes(OKX_SOURCE_FUNDING) ||
    asset.source.includes(OKX_SOURCE_TRADING)
  );
}

export function isOkxEarnRow(asset: Asset): boolean {
  return (
    asset.source === OKX_SOURCE_SIMPLE_EARN ||
    asset.source === OKX_SOURCE_STAKING ||
    asset.source.includes('简单赚币') ||
    asset.source.includes('链上赚币')
  );
}

/** Map OKX internal source label to user-facing exchange sub-account label. */
export function formatOkxDisplaySource(exchangeName: string, assetSource: string): string {
  if (assetSource.includes('简单赚币')) return `${exchangeName} · 简单赚币`;
  if (assetSource.includes('链上赚币')) return `${exchangeName} · 链上赚币`;
  if (assetSource.includes(OKX_SOURCE_FUNDING) && assetSource.includes(OKX_SOURCE_TRADING)) {
    return `${exchangeName} · 现货`;
  }
  if (assetSource.includes(OKX_SOURCE_FUNDING)) return `${exchangeName} · 资金`;
  if (assetSource.includes(OKX_SOURCE_TRADING)) return `${exchangeName} · 交易`;
  return exchangeName;
}

/** Parse spot coin amount from OKX funding account balance row */
export function parseOkxFundingAmount(balance: Record<string, unknown>): number {
  const bal = parseFloat(String(balance.bal ?? '0')) || 0;
  if (bal > 0) return bal;

  const availBal = parseFloat(String(balance.availBal ?? '0')) || 0;
  const frozenBal = parseFloat(String(balance.frozenBal ?? '0')) || 0;
  return availBal + frozenBal;
}

/**
 * Parse spot coin amount from OKX trading account detail row.
 * Prefer cashBal/bal over eq — eq can be "0" while cashBal still holds the balance.
 */
export function parseOkxTradingAmount(detail: Record<string, unknown>): number {
  const cashBal = parseFloat(String(detail.cashBal ?? '0')) || 0;
  if (cashBal > 0) return cashBal;

  const bal = parseFloat(String(detail.bal ?? '0')) || 0;
  if (bal > 0) return bal;

  const availBal = parseFloat(String(detail.availBal ?? '0')) || 0;
  const frozenBal = parseFloat(String(detail.frozenBal ?? '0')) || 0;
  const availPlusFrozen = availBal + frozenBal;
  if (availPlusFrozen > 0) return availPlusFrozen;

  const eq = parseFloat(String(detail.eq ?? '0')) || 0;
  if (eq > 0) return eq;

  const availEq = parseFloat(String(detail.availEq ?? '0')) || 0;
  if (availEq > 0) return availEq;

  return 0;
}

/** Parse amount from OKX Simple Earn (/api/v5/finance/savings/balance) row */
export function parseOkxSavingAmount(row: Record<string, unknown>): number {
  const hasAmtField =
    row.amt !== undefined && row.amt !== null && String(row.amt).trim() !== '';

  if (hasAmtField) {
    const amt = parseFloat(String(row.amt)) || 0;
    if (amt > 0) return amt;

    const loanAmt = parseFloat(String(row.loanAmt ?? '0')) || 0;
    if (loanAmt > 0) return loanAmt;

    const pendingAmt = parseFloat(String(row.pendingAmt ?? '0')) || 0;
    if (pendingAmt > 0) return pendingAmt;

    // amt present but zero — do not fall back to bal (legacy rows often mirror funding)
    return 0;
  }

  // Legacy /api/v5/asset/saving-balance may only expose balance via `bal`
  const bal = parseFloat(String(row.bal ?? '0')) || 0;
  return bal > 0 ? bal : 0;
}

export function mergeOkxSavingBalanceRows(
  financeRows: unknown[],
  legacyRows: unknown[] = []
): unknown[] {
  const byCcy = new Map<string, Record<string, unknown>>();

  for (const row of [...financeRows, ...legacyRows]) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const ccy = baseSymbol(String(record.ccy ?? ''));
    if (!ccy) continue;

    const amount = parseOkxSavingAmount(record);
    const existing = byCcy.get(ccy);
    if (!existing || parseOkxSavingAmount(existing) < amount) {
      byCcy.set(ccy, record);
    }
  }

  return Array.from(byCcy.values());
}

export function assetsFromOkxSavingRows(
  rows: unknown[],
  source = OKX_SOURCE_SIMPLE_EARN
): Asset[] {
  const assets: Asset[] = [];
  if (!Array.isArray(rows)) return assets;

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const amount = parseOkxSavingAmount(record);
    if (amount <= 0) continue;

    const ccy = baseSymbol(String(record.ccy ?? 'UNKNOWN'));
    assets.push({
      symbol: `${ccy} (简单赚币)`,
      amount,
      price: 0,
      valueUsd: 0,
      source,
      type: 'cex',
    });
  }

  return assets;
}

/** Aggregate active on-chain / DeFi earn orders (/api/v5/finance/staking-defi/orders-active). */
export function assetsFromOkxStakingActiveOrders(
  orders: unknown[],
  source = OKX_SOURCE_STAKING
): Asset[] {
  const totals = new Map<string, number>();
  if (!Array.isArray(orders)) return [];

  for (const order of orders) {
    if (!order || typeof order !== 'object') continue;
    const record = order as Record<string, unknown>;
    const state = String(record.state ?? '');
    // Empty state: keep (some responses omit it). 8 pending, 9 onchain, 1 earning, 2 redeeming.
    if (state && !['1', '2', '8', '9'].includes(state)) continue;

    const investData = record.investData;
    if (!Array.isArray(investData)) continue;

    for (const inv of investData) {
      if (!inv || typeof inv !== 'object') continue;
      const row = inv as Record<string, unknown>;
      const symbol = String(row.ccy ?? '').toUpperCase();
      const amount = parseFloat(String(row.amt ?? '0')) || 0;
      if (!symbol || amount <= 0) continue;
      totals.set(symbol, (totals.get(symbol) ?? 0) + amount);
    }
  }

  return Array.from(totals.entries()).map(([symbol, amount]) => {
    const ccy = baseSymbol(symbol);
    return {
      symbol: `${ccy} (链上赚币)`,
      amount,
      price: 0,
      valueUsd: 0,
      source,
      type: 'cex' as const,
    };
  });
}

type OkxTickerResponse = {
  code: string;
  data?: Array<{ instId: string; last: string }>;
};

/** Fetch spot USD prices from OKX public market API (one instId per request). */
export async function fetchOKXSpotPrices(
  symbols: string[],
  fetchImpl: typeof fetch = fetch,
  init?: RequestInit
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {
    USDT: 1,
    USDC: 1,
    DAI: 1,
    FDUSD: 1,
    BUSD: 1,
  };

  const unique = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))];

  await Promise.all(
    unique
      .filter((symbol) => !prices[symbol])
      .map(async (symbol) => {
        try {
          const instId = `${symbol}-USDT`;
          const response = await fetchImpl(
            `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(instId)}`,
            init
          );
          if (!response.ok) return;

          const data = (await response.json()) as OkxTickerResponse;
          if (data.code !== '0' || !Array.isArray(data.data) || !data.data[0]?.last) return;

          const price = parseFloat(data.data[0].last);
          if (price > 0) prices[symbol] = price;
        } catch {
          /* skip single symbol */
        }
      })
  );

  return prices;
}

export function collectOkxPriceSymbols(assets: Asset[]): string[] {
  const symbols: string[] = [];
  for (const asset of assets) {
    if (asset.amount <= 0) continue;
    const base = baseSymbol(asset.symbol);
    if (base && !symbols.includes(base)) symbols.push(base);
  }
  return symbols;
}

export function applyOkxPrices(assets: Asset[], prices: Record<string, number>): void {
  for (const asset of assets) {
    const base = baseSymbol(asset.symbol);
    const price = prices[asset.symbol] || prices[base] || 0;
    const amount = normalizeAmount(asset.amount);
    asset.amount = amount;
    asset.price = price;
    asset.valueUsd = amount * price;
  }
}

/** Merge funding + trading spot rows only (never merge earn rows). */
export function mergeOkxSpotAssets(assets: Asset[]): Asset[] {
  const map = new Map<string, Asset>();

  for (const a of assets) {
    if (!isOkxSpotRow(a)) continue;

    const amount = normalizeAmount(a.amount);
    if (amount <= 0) continue;

    const key = baseSymbol(a.symbol);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...a, symbol: key, amount, valueUsd: normalizeAmount(a.valueUsd) });
      continue;
    }

    existing.amount = normalizeAmount(existing.amount) + amount;
    existing.valueUsd = normalizeAmount(existing.valueUsd) + normalizeAmount(a.valueUsd);
    if (!existing.source.includes(a.source)) {
      existing.source = `${existing.source} · ${a.source}`;
    }
  }

  return Array.from(map.values()).filter((a) => a.amount > 0);
}

function earnDisplaySymbol(row: Asset): string {
  if (row.symbol.includes('(')) return row.symbol;
  const ccy = baseSymbol(row.symbol);
  if (row.source.includes('链上赚币')) return `${ccy} (链上赚币)`;
  return `${ccy} (简单赚币)`;
}

/** Merge earn rows of the same product (e.g. finance + legacy simple earn). */
function mergeOkxEarnAssets(raw: Asset[]): Asset[] {
  const map = new Map<string, Asset>();

  for (const row of raw) {
    if (!isOkxEarnRow(row)) continue;

    const amount = normalizeAmount(row.amount);
    if (amount <= 0) continue;

    const displaySymbol = earnDisplaySymbol(row);
    const key = `${displaySymbol}|${row.source}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...row,
        symbol: displaySymbol,
        amount,
        price: normalizeAmount(row.price),
        valueUsd: normalizeAmount(row.valueUsd),
      });
      continue;
    }

    existing.amount = normalizeAmount(existing.amount) + amount;
    existing.valueUsd = normalizeAmount(existing.valueUsd) + normalizeAmount(row.valueUsd);
  }

  return Array.from(map.values()).filter((a) => normalizeAmount(a.amount) > 0);
}

/**
 * Spot (funding + trading) and earn stay on separate rows — same pattern as Binance.
 * Avoids merging ETH spot with BTC/simple-earn data and breaking display or amounts.
 */
export function finalizeOkxAssets(raw: Asset[]): Asset[] {
  const spot = mergeOkxSpotAssets(raw);
  const earn = mergeOkxEarnAssets(raw);
  const result: Asset[] = [...spot, ...earn];

  const indexed = new Set(result.map((a) => `${baseSymbol(a.symbol)}|${a.source}`));

  for (const row of raw) {
    if (isOkxSpotRow(row) || isOkxEarnRow(row)) continue;

    const amount = normalizeAmount(row.amount);
    if (amount <= 0) continue;

    const key = `${baseSymbol(row.symbol)}|${row.source}`;
    if (indexed.has(key)) continue;
    indexed.add(key);

    result.push({
      ...row,
      symbol: baseSymbol(row.symbol),
      amount,
      price: normalizeAmount(row.price),
      valueUsd: normalizeAmount(row.valueUsd),
    });
  }

  return result.filter((a) => normalizeAmount(a.amount) > 0);
}
