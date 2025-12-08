import { createPublicClient, http, formatUnits, parseAbi } from 'viem';
import { mainnet, bsc, polygon, optimism, arbitrum, base, zksync, soneium, xLayer } from 'viem/chains';
import { Asset } from '@/types';

// Define supported chains
export const SUPPORTED_CHAINS = {
  ethereum: mainnet,
  bsc: bsc,
  polygon: polygon,
  optimism: optimism,
  arbitrum: arbitrum,
  base: base,
  zksync: zksync,
  soneium: soneium,
  xlayer: xLayer,
};

// Common tokens to scan (simplified for MVP)
const COMMON_TOKENS: Record<number, Array<{ symbol: string, address: string, decimals: number }>> = {
  [mainnet.id]: [
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    { symbol: 'EIGEN', address: '0xec53bF9167f50cDEB3AA1304C10fC2216468c574', decimals: 18 },
  ],
  [bsc.id]: [
    { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
  ],
  [polygon.id]: [
    { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
    { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
  ],
  [base.id]: [
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    { symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 }, // Bridged USDT
    { symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
    { symbol: 'cbBTC', address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8 },
    { symbol: 'TOSHI', address: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4', decimals: 18 },
    { symbol: 'ZRO', address: '0x6985884C4392D348587B19cb9eAAf157F13271cd', decimals: 18 },
    { symbol: 'ZORA', address: '0xD835Fb78297729473337387c0D92DfbBF754eE07', decimals: 18 }, // Note: This is ZORA token on Base, check if correct.
    { symbol: 'VIRTUAL', address: '0x0b3e328455c4059EEb9e3743215830bDb83D56c2', decimals: 18 }, 
    { symbol: 'USDbC', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6 },
  ],
  [zksync.id]: [
    { symbol: 'USDC', address: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4', decimals: 6 }, // USDC.e
    { symbol: 'USDT', address: '0x493257fD37EDB34451f62EDf8D2a0C418852bA4C', decimals: 6 },
    { symbol: 'ZK', address: '0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E', decimals: 18 },
  ],
  [soneium.id]: [
     // Add Soneium tokens here when available
  ],
  [xLayer.id]: [
    { symbol: 'USDT', address: '0x1E4a5963aB3f0F5d2332195072092d4169646366', decimals: 6 },
    { symbol: 'USDC', address: '0x74b7f16337b8972027f6196e17a631e38a6c58af', decimals: 6 },
    { symbol: 'WETH', address: '0x5a77f1443d16ee5761d310e38b62f77f726bc71c', decimals: 18 },
    { symbol: 'XDOG', address: '0x0cc24c51BF89c00c5afFBfCf5E856C25ecBdb48e', decimals: 18 },
  ],
};

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
]);

export async function fetchOnChainAssets(address: string): Promise<Asset[]> {
  const assets: Asset[] = [];
  
  const promises = Object.values(SUPPORTED_CHAINS).map(async (chain) => {
    try {
      const client = createPublicClient({
        chain,
        transport: http(),
      });

      // Validate address format
      if (!address.startsWith('0x') || address.length !== 42) {
          return;
      }
      
      // 1. Fetch Native Balance
      const balance = await client.getBalance({ address: address as `0x${string}` });
      const nativeAmount = parseFloat(formatUnits(balance, chain.nativeCurrency.decimals));
      
      if (nativeAmount > 0) {
          assets.push({
              symbol: chain.nativeCurrency.symbol,
              amount: nativeAmount,
              valueUsd: 0,
              price: 0,
              source: `Wallet (${chain.name})`,
              type: 'wallet'
          });
      }

      // 2. Fetch Common Tokens
      const tokens = COMMON_TOKENS[chain.id] || [];
      
      for (const token of tokens) {
          try {
             const tokenBalance = await client.readContract({
                 address: token.address as `0x${string}`,
                 abi: ERC20_ABI,
                 functionName: 'balanceOf',
                 args: [address as `0x${string}`]
             });
             
             const amount = parseFloat(formatUnits(tokenBalance, token.decimals));
             if (amount > 0) {
                 assets.push({
                     symbol: token.symbol,
                     amount: amount,
                     valueUsd: 0,
                     price: 0, 
                     source: `Wallet (${chain.name})`,
                     type: 'wallet'
                 });
             }
          } catch (e) {
              // Ignore individual token errors
          }
      }
      
    } catch (e) {
        console.error(`Error fetching for chain ${chain.name}`, e);
    }
  });

  await Promise.all(promises);
  return assets;
}

