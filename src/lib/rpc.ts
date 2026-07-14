import { createPublicClient, http, fallback, PublicClient, Chain } from 'viem';
import { base } from 'viem/chains';

/** Supported EVM chains for custom RPC settings UI */
export const RPC_CHAIN_LIST: Array<{ id: number; name: string }> = [
  { id: 1, name: 'Ethereum' },
  { id: 56, name: 'BNB Chain' },
  { id: 137, name: 'Polygon' },
  { id: 10, name: 'Optimism' },
  { id: 42161, name: 'Arbitrum' },
  { id: 8453, name: 'Base' },
  { id: 324, name: 'zkSync Era' },
  { id: 43114, name: 'Avalanche' },
  { id: 59144, name: 'Linea' },
  { id: 196, name: 'X Layer' },
  { id: 1868, name: 'Soneium' },
  { id: 80094, name: 'Berachain' },
  { id: 57073, name: 'Ink' },
  { id: 98866, name: 'Plume' },
  { id: 999, name: 'HyperEVM' },
  { id: 4663, name: 'Robinhood Chain' },
];

let customRpcUrls: Record<number, string> = {};

export function setCustomRpcUrls(urls: Record<number, string>) {
  customRpcUrls = urls;
  clientCache.clear();
}

export function clearRpcClientCache() {
  clientCache.clear();
}

export function getDefaultRpcUrl(chainId: number): string | undefined {
  return CHAIN_RPC_FALLBACKS[chainId]?.[0];
}

// viem 2.x 默认 mainnet RPC 为 eth.merkle.io，浏览器/部分网络下易 Failed to fetch。
// 为各链配置可回退的公共 RPC（优先 publicnode / llamarpc / 1rpc）。
const CHAIN_RPC_FALLBACKS: Record<number, string[]> = {
  1: [
    'https://ethereum-rpc.publicnode.com',
    'https://1rpc.io/eth',
    'https://eth.llamarpc.com',
    'https://cloudflare-eth.com',
  ],
  56: [
    'https://bsc-rpc.publicnode.com',
    'https://1rpc.io/bnb',
    'https://bsc-dataseed.binance.org',
  ],
  137: [
    'https://polygon-bor-rpc.publicnode.com',
    'https://1rpc.io/matic',
    'https://polygon-rpc.com',
  ],
  10: [
    'https://optimism-rpc.publicnode.com',
    'https://1rpc.io/op',
    'https://mainnet.optimism.io',
  ],
  42161: [
    'https://arbitrum-one-rpc.publicnode.com',
    'https://1rpc.io/arb',
    'https://arb1.arbitrum.io/rpc',
  ],
  8453: [
    'https://base-rpc.publicnode.com',
    'https://1rpc.io/base',
    'https://base.meowrpc.com',
    'https://base.llamarpc.com',
    'https://mainnet.base.org',
  ],
  324: [
    'https://zksync-era-rpc.publicnode.com',
    'https://mainnet.era.zksync.io',
  ],
  43114: [
    'https://avalanche-c-chain-rpc.publicnode.com',
    'https://1rpc.io/avax/c',
    'https://api.avax.network/ext/bc/C/rpc',
  ],
  59144: [
    'https://linea-rpc.publicnode.com',
    'https://1rpc.io/linea',
    'https://rpc.linea.build',
  ],
  196: [
    'https://xlayer-rpc.publicnode.com',
    'https://rpc.xlayer.tech',
  ],
  1868: [
    'https://rpc.soneium.org',
  ],
  80094: [
    'https://rpc.berachain.com',
  ],
  57073: [
    'https://rpc-gel.inkonchain.com',
  ],
  98866: [
    'https://rpc.plume.org',
  ],
  999: [
    'https://rpc.hyperliquid.xyz/evm',
  ],
  4663: [
    'https://rpc.mainnet.chain.robinhood.com',
  ],
};

function getRpcUrls(chain: Chain): string[] {
  const custom = customRpcUrls[chain.id]?.trim();
  // User-configured RPC: use exclusively (no public fallback)
  if (custom) return [custom];

  const configured = CHAIN_RPC_FALLBACKS[chain.id] ?? [];
  const defaults = [
    ...(chain.rpcUrls?.public?.http ?? []),
    ...(chain.rpcUrls?.default?.http ?? []),
  ];
  return [...new Set([...configured, ...defaults])];
}

const clientCache = new Map<number, PublicClient>();

export function getChainClient(chain: Chain): PublicClient {
  const cached = clientCache.get(chain.id);
  if (cached) return cached;

  const urls = getRpcUrls(chain);
  const httpOpts = {
    batch: { wait: 100, batchSize: 10 },
    timeout: 15_000,
  } as const;

  const transport =
    urls.length === 1
      ? http(urls[0], httpOpts)
      : fallback(
          urls.map((url) => http(url, httpOpts)),
          { rank: true, retryCount: 2, retryDelay: 1000 }
        );

  const client = createPublicClient({ chain, transport });

  clientCache.set(chain.id, client);
  return client;
}

export function getBaseClient(): PublicClient {
  return getChainClient(base);
}
