import { createPublicClient, http, formatUnits, parseAbi, defineChain } from 'viem';
import { mainnet, bsc, polygon, optimism, arbitrum, base, zksync, soneium, xLayer, avalanche, linea } from 'viem/chains';
import { Asset } from '@/types';

// Define Ink Chain
export const ink = defineChain({
  id: 57073,
  name: 'Ink',
  network: 'ink',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc-gel.inkonchain.com'] },
    public: { http: ['https://rpc-gel.inkonchain.com'] },
  },
  blockExplorers: {
    default: { name: 'Ink Explorer', url: 'https://explorer.inkonchain.com' },
  },
});

// Define Plume Testnet Chain
export const plumeMainnet = defineChain({
  id: 98866,
  name: 'Plume',
  network: 'plume',
  nativeCurrency: {
    decimals: 18,
    name: 'Plume',
    symbol: 'PLUME',
  },
  rpcUrls: {
    default: { http: ['https://rpc.plume.org'] },
    public: { http: ['https://rpc.plume.org'] },
  },
  blockExplorers: {
    default: { name: 'Plume Explorer', url: 'https://explorer.plume.org' },
  },
});

// Define Berachain Mainnet
export const berachainMainnet = defineChain({
  id: 80094,
  name: 'Berachain',
  network: 'berachain',
  nativeCurrency: {
    decimals: 18,
    name: 'BERA',
    symbol: 'BERA',
  },
  rpcUrls: {
    default: { http: ['https://rpc.berachain.com'] },
    public: { http: ['https://rpc.berachain.com'] },
  },
  blockExplorers: {
    default: { name: 'Berachain Explorer', url: 'https://explorer.berachain.com' },
  },
});

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
  avalanche: avalanche,
  linea: linea,
  berachain: berachainMainnet, // Mainnet 80094
  ink: ink,
  plume: plumeMainnet,
};

// Map chain ID to DeFiLlama chain name
const DEFILLAMA_CHAIN_MAP: Record<number, string> = {
    [mainnet.id]: 'ethereum',
    [bsc.id]: 'bsc',
    [polygon.id]: 'polygon',
    [optimism.id]: 'optimism',
    [arbitrum.id]: 'arbitrum',
    [base.id]: 'base',
    [zksync.id]: 'era',
    [soneium.id]: 'soneium',
    [xLayer.id]: 'xlayer',
    [avalanche.id]: 'avax',
    [linea.id]: 'linea',
    [berachainMainnet.id]: 'berachain', // Usually 'berachain' for mainnet
    [ink.id]: 'ink', 
    [plumeMainnet.id]: 'plume', 
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
    { symbol: 'ZORA', address: '0xD835Fb78297729473337387c0D92DfbBF754eE07', decimals: 18 }, 
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
  [avalanche.id]: [
    { symbol: 'USDT', address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6 },
    { symbol: 'USDC', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
    { symbol: 'WETH.e', address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18 },
    { symbol: 'BTC.b', address: '0x152b9d0FdC40C096757F570A51E494bd4b943E50', decimals: 8 },
  ],
  [linea.id]: [
    { symbol: 'USDC', address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', decimals: 6 },
    { symbol: 'USDT', address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93', decimals: 6 },
    { symbol: 'WETH', address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', decimals: 18 },
    { symbol: 'DAI', address: '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5', decimals: 18 },
  ],
  [berachainMainnet.id]: [
      // Add mainnet tokens when available
  ],
  [ink.id]: [
      { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      { symbol: 'USDT', address: '0x0200c29006150606b650577bbe7b6248f58470c1', decimals: 6 },
  ],
  [plumeMainnet.id]: [
     // Add tokens when addresses are confirmed
  ]
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
              type: 'wallet',
              chainId: chain.id,
              chainName: DEFILLAMA_CHAIN_MAP[chain.id],
              contractAddress: '0x0000000000000000000000000000000000000000' // Special address for native
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
                     type: 'wallet',
                     chainId: chain.id,
                     chainName: DEFILLAMA_CHAIN_MAP[chain.id],
                     contractAddress: token.address
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
