import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { Asset } from '@/types';

// EigenLayer StrategyManager Contract on Mainnet
// Source (official docs / Etherscan):
// https://etherscan.io/address/0x858646372cc42e1a627fce94aa7a7033e7cf075a
const STRATEGY_MANAGER_ADDRESS = '0x858646372CC42E1A627fcE94aa7A7033e7CF075A';

// Common Strategies - Official addresses from EigenLayer documentation
const STRATEGIES = [
  { name: 'stETH Strategy', symbol: 'stETH (Eigen)', address: '0x7D704507b76571a51d9caE8AdDAbBFd0ba0e63d3', decimals: 18 },
  { name: 'rETH Strategy', symbol: 'rETH (Eigen)', address: '0x3A8fBdf9e77DFc25d09741f51d3E181b25d0c4E0', decimals: 18 },
  { name: 'cbETH Strategy', symbol: 'cbETH (Eigen)', address: '0x70EB4D3c164a6B4A5f908D4FBb5a9cAfFb66bAB6', decimals: 18 },
  { name: 'WETH Strategy', symbol: 'WETH (Eigen)', address: '0x80528D6e9A2BAbFc766965E0E26d5aB08D9CFaF9', decimals: 18 },
  // swETH Strategy - multiple addresses found, adding both
  { name: 'swETH Strategy', symbol: 'swETH (Eigen)', address: '0x2aeBBA35224c4f82922162765B46FeBd8Dfe1E14', decimals: 18 },
  { name: 'swETH Strategy', symbol: 'swETH (Eigen)', address: '0x0Fe4F44beE93503346A3Ac9EE5A26b130a5796d6', decimals: 18 },
  // Add more as needed: osETH, etc.
];

const STRATEGY_MANAGER_ABI = parseAbi([
  'function getDeposits(address staker) view returns (address[], uint256[])',
  'function stakerStrategyShares(address staker, address strategy) view returns (uint256)'
]);

export async function fetchEigenLayerAssets(address: string): Promise<Asset[]> {
  console.log('[EigenLayer] fetchEigenLayerAssets called with address:', address);
  const assets: Asset[] = [];
  
  // Only Mainnet
  const client = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  if (!address.startsWith('0x') || address.length !== 42) {
      console.warn('[EigenLayer] Invalid address format:', address);
      return [];
  }

  console.log('[EigenLayer] Starting to fetch assets for', address);
  try {
      // First, try to use getDeposits to get all strategies the user has deposited into
      // This is more reliable than checking a hardcoded list
      try {
          const [strategyAddresses, shares] = await client.readContract({
              address: STRATEGY_MANAGER_ADDRESS,
              abi: STRATEGY_MANAGER_ABI,
              functionName: 'getDeposits',
              args: [address as `0x${string}`]
          });
          
          console.log(`[EigenLayer] getDeposits found ${strategyAddresses.length} strategies for ${address}`);
          console.log(`[EigenLayer] Strategy addresses:`, strategyAddresses.map((addr: string) => addr.toLowerCase()));
          
          // Create a map of strategy addresses to known strategy info
          const strategyMap = new Map(
              STRATEGIES.map(s => [s.address.toLowerCase(), s])
          );
          
          // Process each strategy found via getDeposits
          for (let i = 0; i < strategyAddresses.length; i++) {
              const strategyAddr = (strategyAddresses[i] as string).toLowerCase();
              const sharesAmount = shares[i] as bigint;
              
              console.log(`[EigenLayer] Processing strategy ${strategyAddr} with ${formatUnits(sharesAmount, 18)} shares`);
              
              if (sharesAmount > 0n) {
                  const knownStrategy = strategyMap.get(strategyAddr);
                  
                  if (knownStrategy) {
                      const amount = parseFloat(formatUnits(sharesAmount, knownStrategy.decimals));
                      console.log(`[EigenLayer] Found known strategy: ${knownStrategy.name} with ${amount} tokens`);
                      if (amount > 0) {
                          assets.push({
                              symbol: knownStrategy.symbol,
                              amount: amount,
                              valueUsd: 0,
                              price: 0,
                              source: 'EigenLayer',
                              type: 'wallet' as const,
                              chainId: mainnet.id,
                              chainName: 'ethereum',
                              contractAddress: strategyAddr
                          });
                      }
                  } else {
                      // Unknown strategy - try to identify by contract address
                      // Check if it's a known strategy by address pattern
                      let symbol = `Unknown Strategy (${strategyAddr.slice(0, 6)}...)`;
                      
                      // Try to identify swETH strategy by checking if address matches known swETH patterns
                      if (strategyAddr === '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6' || 
                          strategyAddr === '0x2aebba35224c4f82922162765b46febd8dfe1e14') {
                          symbol = 'swETH (Eigen)';
                          console.log(`[EigenLayer] Identified swETH strategy by address: ${strategyAddr}`);
                      }
                      
                      console.log(`[EigenLayer] Unknown strategy found: ${strategyAddr} with ${formatUnits(sharesAmount, 18)} shares`);
                      const amount = parseFloat(formatUnits(sharesAmount, 18));
                      if (amount > 0) {
                          assets.push({
                              symbol: symbol,
                              amount: amount,
                              valueUsd: 0,
                              price: 0,
                              source: 'EigenLayer',
                              type: 'wallet' as const,
                              chainId: mainnet.id,
                              chainName: 'ethereum',
                              contractAddress: strategyAddr
                          });
                      }
                  }
              }
          }
      } catch (getDepositsError: any) {
          console.warn('[EigenLayer] getDeposits failed, falling back to stakerStrategyShares:', getDepositsError.message);
          
          // Fallback: iterate known strategies and check shares
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
                          valueUsd: 0,
                          price: 0,
                          source: 'EigenLayer',
                          type: 'wallet' as const,
                          chainId: mainnet.id,
                          chainName: 'ethereum',
                          contractAddress: strategy.address
                      };
                  }
              } catch (e) {
                  // Ignore individual strategy errors
              }
              return null;
          });
          
          const results = await Promise.all(promises);
          results.forEach(res => {
              if (res) assets.push(res);
          });
      }

  } catch (e: any) {
      console.error("[EigenLayer] Fetch error:", e);
      console.error("[EigenLayer] Error details:", {
          message: e?.message,
          stack: e?.stack,
          name: e?.name
      });
  }

  console.log(`[EigenLayer] Returning ${assets.length} assets for ${address}`);
  return assets;
}

