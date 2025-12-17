import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, linea, bsc, zksync, xLayer, soneium } from 'viem/chains';
import { Asset } from '@/types';
import { getBaseClient } from '@/lib/rpc';

// Aave V3 Pool Contract Addresses
// Source: https://github.com/bgd-labs/aave-address-book
const POOL_ADDRESSES: Record<number, string> = {
  [mainnet.id]: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  [polygon.id]: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  [arbitrum.id]: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  [optimism.id]: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  [base.id]: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  [avalanche.id]: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  // Linea Aave V3 Pool (from official docs)
  [linea.id]: '0xc47b8C00b0f69a36fa203Ffeac0334874574a8Ac',
  [bsc.id]: '0x6807dc923806fE8F4c9454cEb2c689F8802E4aa3', // Aave V3 BNB
  [zksync.id]: '0x513c7E3a9c69cA91225a819801f37070423a75Aa', // Aave V3 zkSync Era (Verified from docs)
  // [xLayer.id]: '', // TODO: Add X Layer address when available
  // [soneium.id]: '', // TODO: Add Soneium address when available
};

// Common reserve assets to check (underlying token addresses)
const COMMON_RESERVES: Record<number, Array<{ symbol: string, address: string, decimals: number }>> = {
  [mainnet.id]: [
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  ],
  [polygon.id]: [
    { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
    { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
    { symbol: 'WETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
  ],
  [arbitrum.id]: [
    { symbol: 'USDC', address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
    { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  ],
  [optimism.id]: [
    { symbol: 'USDC', address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 },
    { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  ],
  [base.id]: [
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    { symbol: 'cbETH', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18 },
  ],
  [avalanche.id]: [
    { symbol: 'USDC', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
    { symbol: 'USDT', address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6 },
    { symbol: 'WETH', address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18 },
  ],
  [linea.id]: [
    { symbol: 'USDC', address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', decimals: 6 },
    { symbol: 'USDT', address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93', decimals: 6 },
    { symbol: 'WETH', address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', decimals: 18 },
  ],
  [bsc.id]: [
    { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
    { symbol: 'WBNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18 },
    { symbol: 'ETH', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18 },
  ],
  [zksync.id]: [
    { symbol: 'USDC', address: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4', decimals: 6 },
    { symbol: 'USDT', address: '0x493257fD37EDB34451f62EDf8D2a0C418852bA4C', decimals: 6 },
    { symbol: 'WETH', address: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91', decimals: 18 },
  ],
  [xLayer.id]: [
    { symbol: 'USDT', address: '0x1E4a5963aB3f0F5d2332195072092d4169646366', decimals: 6 },
    { symbol: 'USDC', address: '0x74b7f16337b8972027f6196e17a631e38a6c58af', decimals: 6 },
    { symbol: 'WETH', address: '0x5a77f1443d16ee5761d310e38b62f77f726bc71c', decimals: 18 },
  ],
  [soneium.id]: [
    // Add Soneium tokens here when available
  ],
};

const POOL_ABI = [
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'getReserveData',
    outputs: [
      { name: 'configuration', type: 'uint128' },
      { name: 'liquidityIndex', type: 'uint128' },
      { name: 'currentLiquidityRate', type: 'uint128' },
      { name: 'variableBorrowIndex', type: 'uint128' },
      { name: 'currentVariableBorrowRate', type: 'uint128' },
      { name: 'currentStableBorrowRate', type: 'uint128' },
      { name: 'lastUpdateTimestamp', type: 'uint40' },
      { name: 'id', type: 'uint16' },
      { name: 'aTokenAddress', type: 'address' },
      { name: 'stableDebtTokenAddress', type: 'address' },
      { name: 'variableDebtTokenAddress', type: 'address' },
      { name: 'interestRateStrategyAddress', type: 'address' },
      { name: 'accruedToTreasury', type: 'uint128' },
      { name: 'unbacked', type: 'uint128' },
      { name: 'isolationModeTotalDebt', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
    // ... rest of ABI ...
  },
] as const;

// Simplified ABI for checking pool validity if needed, but we rely on getReserveData
const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

export async function fetchAaveAssets(address: string): Promise<Asset[]> {
  const assets: Asset[] = [];
  
  if (!address.startsWith('0x') || address.length !== 42) {
    return [];
  }

  // Define chains to check
  const chains = [
    mainnet, polygon, arbitrum, optimism, base, avalanche, linea, 
    bsc, zksync, xLayer, soneium
  ];
  
  // Process chains sequentially to avoid rate limiting
  for (const chain of chains) {
    let chainSkipped = false;
    
    try {
      const poolAddress = POOL_ADDRESSES[chain.id];
      // Skip chains without known Aave Pool address
      if (!poolAddress) continue;

      let client;
        if (chain.id === base.id) {
        client = getBaseClient();
        } else {
        client = createPublicClient({
        chain,
        transport: http(),
      });
        }
      
      // Basic check if it's a contract (skip if not)
      // Note: for some chains this check might fail due to RPC issues, so we wrap it
      try {
        const code = await client.getBytecode({ address: poolAddress as `0x${string}` });
        if (!code || code === '0x') {
          console.warn(`[Aave] Pool address ${poolAddress} on ${chain.name} is not a contract, skipping.`);
          continue;
        }
      } catch (e) {
          // If check fails, we proceed optimistically
      }

      const reserves = COMMON_RESERVES[chain.id] || [];
      
      // Process reserves
      for (const reserve of reserves) {
        if (chainSkipped) break;
        
        // Delay to be nice to RPCs
        const delay = chain.id === base.id ? 2000 : 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          // Get reserve data
          let reserveData;
            try {
              reserveData = await client.readContract({
                address: poolAddress as `0x${string}`,
                abi: POOL_ABI,
                functionName: 'getReserveData',
                args: [reserve.address as `0x${string}`]
              });
          } catch (e: any) {
             // Handle RPC errors or contract errors
             const msg = e.message || String(e);
             if (msg.includes('execution reverted') || msg.includes('returned no data')) {
                 // Asset not supported or pool issue
                  continue;
                }
             console.warn(`[Aave] Error fetching reserve ${reserve.symbol} on ${chain.name}: ${msg}`);
            continue;
          }

          if (!reserveData) continue;

          const [,,,,,,,, aTokenAddress,, variableDebtTokenAddress] = reserveData;

          // 1. Check Supply (aToken)
          if (aTokenAddress && aTokenAddress !== '0x0000000000000000000000000000000000000000') {
              try {
                  const balance = await client.readContract({
                      address: aTokenAddress,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [address as `0x${string}`]
                });
                  
                  // Try to get decimals, fallback to reserve decimals
                  let decimals = reserve.decimals;
                  try {
                      const d = await client.readContract({
                          address: aTokenAddress,
                          abi: ERC20_ABI,
                          functionName: 'decimals'
                      });
                      decimals = d;
                  } catch {}
            
                  const amount = parseFloat(formatUnits(balance, decimals));
                  if (amount > 0) {
            assets.push({
                symbol: `${reserve.symbol} (Aave Supply)`,
                          amount,
              valueUsd: 0,
              price: 0,
              source: `Aave (${chain.name})`,
              type: 'wallet',
              chainId: chain.id,
                chainName: chain.name.toLowerCase(),
                          contractAddress: aTokenAddress
              });
                  }
              } catch (e) {
                  console.warn(`[Aave] Error checking aToken balance for ${reserve.symbol} on ${chain.name}`);
              }
          }

          // 2. Check Borrow (Variable Debt)
          if (variableDebtTokenAddress && variableDebtTokenAddress !== '0x0000000000000000000000000000000000000000') {
              try {
                  const balance = await client.readContract({
                      address: variableDebtTokenAddress,
                      abi: ERC20_ABI,
                      functionName: 'balanceOf',
                      args: [address as `0x${string}`]
                    });
                  
                   const amount = parseFloat(formatUnits(balance, reserve.decimals));
                   if (amount > 0) {
            assets.push({
                          symbol: `${reserve.symbol} (Aave Borrow)`,
                          amount,
              valueUsd: 0,
              price: 0,
              source: `Aave (${chain.name})`,
              type: 'wallet',
              chainId: chain.id,
                      chainName: chain.name.toLowerCase(),
                          contractAddress: variableDebtTokenAddress
                    });
                }
              } catch (e) {
                  // Ignore
            }
          }

        } catch (e) {
             console.error(`[Aave] Critical error for ${reserve.symbol} on ${chain.name}`, e);
        }
      }
    } catch (e) {
       console.error(`[Aave] Error processing chain ${chain.name}`, e);
      }
  }

  return assets;
}
