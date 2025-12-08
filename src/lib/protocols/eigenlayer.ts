import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { Asset } from '@/types';

// EigenLayer StrategyManager Contract on Mainnet
const STRATEGY_MANAGER_ADDRESS = '0x858646372CC42348f6f99D24cf847e70644A5960';

// Common Strategies
const STRATEGIES = [
  { name: 'stETH Strategy', symbol: 'stETH (Eigen)', address: '0x93c4b944D05dfe6df7645A86cd2206016c51564D', decimals: 18 },
  { name: 'rETH Strategy', symbol: 'rETH (Eigen)', address: '0x1BeE69B7dFFfA4E2d53C2a2Df135C388AD25dCD2', decimals: 18 },
  { name: 'cbETH Strategy', symbol: 'cbETH (Eigen)', address: '0x54945180dB7943c0ed0FEE7EdaB2Bd24620256bc', decimals: 18 },
  { name: 'WETH Strategy', symbol: 'WETH (Eigen)', address: '0xa4C637e0F704745D182e4D38cAb7E7485329d0Ab', decimals: 18 },
  { name: 'swETH Strategy', symbol: 'swETH (Eigen)', address: '0x0Fe4F44beE93503346A3Ac9EE5A26b130d5D60F6', decimals: 18 },
  // Add more as needed: osETH, swETH, etc.
];

const STRATEGY_MANAGER_ABI = parseAbi([
  'function getDeposits(address staker) view returns (address[], uint256[])',
  'function stakerStrategyShares(address staker, address strategy) view returns (uint256)'
]);

export async function fetchEigenLayerAssets(address: string): Promise<Asset[]> {
  const assets: Asset[] = [];
  
  // Only Mainnet
  const client = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  if (!address.startsWith('0x') || address.length !== 42) {
      return [];
  }

  try {
      // We can iterate known strategies and check shares.
      // Or use getDeposits if available (might be heavy or deprecated, let's check shares for known list)
      
      const promises = STRATEGIES.map(async (strategy) => {
          try {
              const shares = await client.readContract({
                  address: STRATEGY_MANAGER_ADDRESS,
                  abi: STRATEGY_MANAGER_ABI,
                  functionName: 'stakerStrategyShares',
                  args: [address as `0x${string}`, strategy.address as `0x${string}`]
              });
              
              const amount = parseFloat(formatUnits(shares, strategy.decimals));
              
              if (amount > 0) {
                  return {
                      symbol: strategy.symbol,
                      amount: amount,
                      valueUsd: 0, // Will be filled by price fetcher (mapped to underlying token usually)
                      price: 0,
                      source: 'EigenLayer',
                      type: 'wallet' as const
                  };
              }
          } catch (e) {
              // Ignore
          }
          return null;
      });
      
      const results = await Promise.all(promises);
      results.forEach(res => {
          if (res) assets.push(res);
      });

  } catch (e) {
      console.error("EigenLayer fetch error", e);
  }

  return assets;
}

