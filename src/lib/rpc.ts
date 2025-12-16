import { createPublicClient, http, fallback, PublicClient } from 'viem';
import { base } from 'viem/chains';

const BASE_RPC_URLS = [
  'https://base-rpc.publicnode.com', // Usually reliable
  'https://1rpc.io/base',
  'https://base.meowrpc.com',
  'https://base.llamarpc.com',
  'https://base.gateway.tenderly.co',
  'https://mainnet.base.org', // Official, but often rate limited/forbidden for batch
];

export const baseClient = createPublicClient({
  chain: base,
  transport: fallback(
    BASE_RPC_URLS.map(url => http(url, {
        batch: {
            wait: 100,
            batchSize: 10 // Limit batch size to avoid 403/429
        }
    })),
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
