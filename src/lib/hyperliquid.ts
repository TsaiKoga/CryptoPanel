import { Asset } from '@/types';
import { isChromeExtension } from '@/lib/storage';

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

type HyperliquidSpotBalance = {
  coin: string;
  total: string;
};

type HyperliquidSpotClearinghouseState = {
  balances?: HyperliquidSpotBalance[];
};

type HyperliquidSpotMetaAndAssetCtxs = [unknown, Array<{ coin: string; markPx?: string }>];

type HyperliquidDelegatorSummary = {
  delegated?: string;
  undelegated?: string;
  totalPendingWithdrawal?: string;
};

function safeParseFloat(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

async function postInfo<T>(body: any): Promise<T> {
  const url = isChromeExtension ? HYPERLIQUID_INFO_URL : '/api/hyperliquid/info';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Hyperliquid info error: ${res.status} ${res.statusText} ${text}`.trim());
  }
  return res.json();
}

/**
 * Fetch Hyperliquid (HyperCore) spot balances for a given EVM address.
 * This is NOT onchain RPC — it uses Hyperliquid public API.
 */
export async function fetchHyperliquidAssets(
  address: string,
  walletName?: string
): Promise<Asset[]> {
  if (!address.startsWith('0x') || address.length !== 42) return [];

  const source = walletName ? `${walletName} (Hyperliquid)` : 'Wallet (Hyperliquid)';

  const [state, metaAndCtxs, delegatorSummary] = await Promise.all([
    postInfo<HyperliquidSpotClearinghouseState>({
      type: 'spotClearinghouseState',
      user: address,
    }),
    postInfo<HyperliquidSpotMetaAndAssetCtxs>({
      type: 'spotMetaAndAssetCtxs',
    }),
    postInfo<HyperliquidDelegatorSummary>({
      type: 'delegatorSummary',
      user: address,
    }).catch(() => ({})),
  ]);

  const pxByCoin = new Map<string, number>();
  const ctxs = Array.isArray(metaAndCtxs) ? metaAndCtxs[1] : [];
  for (const ctx of ctxs ?? []) {
    if (!ctx?.coin) continue;
    const px = safeParseFloat(ctx.markPx);
    if (px > 0) pxByCoin.set(ctx.coin, px);
  }

  const assets: Asset[] = [];
  for (const bal of state.balances ?? []) {
    const amount = safeParseFloat(bal.total);
    if (!bal.coin || amount <= 0) continue;

    // Hyperliquid spot is quoted in USDC; markPx is USD-like.
    const price = bal.coin === 'USDC' ? 1 : pxByCoin.get(bal.coin) || 0;
    assets.push({
      symbol: bal.coin,
      amount,
      price,
      valueUsd: amount * price,
      source,
      type: 'wallet',
      // Let price API fallback by symbol when needed.
    });
  }

  // HyperCore staking (delegated HYPE). Count it as an additional HYPE position.
  const staked = safeParseFloat(delegatorSummary?.delegated);
  const pendingWithdrawal = safeParseFloat(delegatorSummary?.totalPendingWithdrawal);
  const unstaked = safeParseFloat(delegatorSummary?.undelegated);
  const stakedTotal = staked + pendingWithdrawal + unstaked;

  if (stakedTotal > 0) {
    const hypePrice = pxByCoin.get('HYPE') || 0;
    assets.push({
      symbol: 'HYPE (Staked)',
      amount: stakedTotal,
      price: hypePrice,
      valueUsd: stakedTotal * hypePrice,
      source,
      type: 'wallet',
      // Leave chainName/contractAddress empty; price is set from Hyperliquid ctxs.
    });
  }

  return assets;
}

