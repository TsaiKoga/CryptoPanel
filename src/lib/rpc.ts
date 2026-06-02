import { createPublicClient, http, fallback, PublicClient, Chain } from 'viem';
import { base } from 'viem/chains';

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
};

function getRpcUrls(chain: Chain): string[] {
  const configured = CHAIN_RPC_FALLBACKS[chain.id];
  if (configured?.length) return configured;

  const defaults = [
    ...(chain.rpcUrls?.public?.http ?? []),
    ...(chain.rpcUrls?.default?.http ?? []),
  ];
  return [...new Set(defaults)];
}

const clientCache = new Map<number, PublicClient>();

export function getChainClient(chain: Chain): PublicClient {
  const cached = clientCache.get(chain.id);
  if (cached) return cached;

  const urls = getRpcUrls(chain);
  const client = createPublicClient({
    chain,
    transport: fallback(
      urls.map((url) =>
        http(url, {
          batch: {
            wait: 100,
            batchSize: 10,
          },
          timeout: 15_000,
        })
      ),
      {
        rank: true,
        retryCount: 2,
        retryDelay: 1000,
      }
    ),
  });

  clientCache.set(chain.id, client);
  return client;
}

export function getBaseClient(): PublicClient {
  return getChainClient(base);
}
