import { createPublicClient, http, fallback, PublicClient } from 'viem';
import { base } from 'viem/chains';

const BASE_RPC_URLS = [
  'https://mainnet.base.org',
  'https://base.gateway.tenderly.co',
  'https://base-rpc.publicnode.com',
  'https://1rpc.io/base',
  'https://base.meowrpc.com',
  'https://base.llamarpc.com',
];

export const baseClient = createPublicClient({
  chain: base,
  transport: fallback(
    BASE_RPC_URLS.map(url => http(url)),
    {
      rank: true, // Automatically rank transports by latency/stability
      retryCount: 3, // Retry 3 times per transport
      retryDelay: 1000, // Wait 1s between retries
    }
  ),
});

/**
 * Creates a new client if needed, or returns the shared one.
 * Using a shared client with fallback transport is efficient.
 */
export function getBaseClient(): PublicClient {
  return baseClient;
}

