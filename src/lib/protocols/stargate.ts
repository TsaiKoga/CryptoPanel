import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { arbitrum, mainnet, base, optimism, polygon, bsc, avalanche } from 'viem/chains';
import { Asset } from '@/types';

// Stargate LP Staking Farm Contract Addresses
// Source: https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet
const STAKING_CONTRACTS: Record<number, string> = {
  [arbitrum.id]: '0x9774558534036Ff2E236331546691b4eB70594b1', // Arbitrum LP Staking Farm
  [mainnet.id]: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b', // Ethereum LP Staking Farm
  [base.id]: '0x06Eb48763f117c7Be5ED9d26b43e39e3d3d8F8c6', // Base LP Staking Farm
  [optimism.id]: '0x4DeA9e918c6289a52cd469cAC652727B7b412Ed2', // Optimism LP Staking Farm
  [polygon.id]: '0x8731d54E9D02c286767d56ac03e8037C07e01e98', // Polygon LP Staking Farm
  [bsc.id]: '0x3052A0F6ab15b4AE1df39962d5DdEFacA86DaB47', // BSC LP Staking Farm
  [avalanche.id]: '0x8731d54E9D02c286767d56ac03e8037C07e01e98', // Avalanche LP Staking Farm
};

// Stargate Staking ABI
const STAKING_ABI = parseAbi([
  'function poolLength() view returns (uint256)',
  'function poolInfo(uint256) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accStargatePerShare)',
  'function userInfo(uint256 poolId, address user) view returns (uint256 amount, uint256 rewardDebt)',
  'function stargate() view returns (address)', // STG token address
]);

// ERC20 ABI for LP tokens
const ERC20_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
]);

export async function fetchStargateAssets(address: string): Promise<Asset[]> {
  const assets: Asset[] = [];
  
  if (!address.startsWith('0x') || address.length !== 42) {
    return [];
  }

  // Check multiple chains where Stargate has staking
  const chains = [arbitrum, mainnet, base, optimism, polygon, bsc, avalanche];
  
  for (const chain of chains) {
    try {
      const stakingAddress = STAKING_CONTRACTS[chain.id];
      if (!stakingAddress) continue;

      const client = createPublicClient({
        chain,
        transport: http(),
      });

      // Get pool count - try multiple possible function names
      let poolCount = 0n;
      let useFallback = false;
      
      try {
        poolCount = await client.readContract({
          address: stakingAddress as `0x${string}`,
          abi: STAKING_ABI,
          functionName: 'poolLength',
        });
      } catch (e) {
        // Try alternative: some contracts use poolCount() instead
        try {
          const altABI = parseAbi(['function poolCount() view returns (uint256)']);
          poolCount = await client.readContract({
            address: stakingAddress as `0x${string}`,
            abi: altABI,
            functionName: 'poolCount',
          });
        } catch (e2) {
          console.warn(`[Stargate] Failed to get pool count on ${chain.name}, will query common pools directly`);
          // If poolLength fails, try querying common pool IDs directly
          useFallback = true;
          poolCount = 15n; // Try first 15 pools as fallback
        }
      }

      // Iterate through pools to find user's staked positions
      // Limit to reasonable number to avoid too many RPC calls
      const maxPools = useFallback ? 15 : Math.min(Number(poolCount), 20);
      
      console.log(`[Stargate] Checking ${maxPools} pools on ${chain.name} (fallback: ${useFallback})`);
      
      for (let poolId = 0; poolId < maxPools; poolId++) {
        // Add delay to avoid rate limiting
        if (poolId > 0 && poolId % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        try {
          // Get user info first (cheaper call) - if no stake, skip pool info
          let userInfo;
          try {
            userInfo = await client.readContract({
              address: stakingAddress as `0x${string}`,
              abi: STAKING_ABI,
              functionName: 'userInfo',
              args: [BigInt(poolId), address as `0x${string}`],
            });
          } catch (e) {
            // Pool might not exist, skip
            continue;
          }

          const stakedAmount = userInfo[0] as bigint;
          
          if (stakedAmount === 0n) {
            continue; // No stake in this pool
          }

          // Get pool info to get LP token address
          let lpTokenAddress: string;
          try {
            const poolInfo = await client.readContract({
              address: stakingAddress as `0x${string}`,
              abi: STAKING_ABI,
              functionName: 'poolInfo',
              args: [BigInt(poolId)],
            });
            lpTokenAddress = poolInfo[0] as string;
          } catch (e) {
            console.warn(`[Stargate] Failed to get pool info for pool ${poolId} on ${chain.name}`);
            continue;
          }

          // Get LP token symbol and decimals
          let symbol = `LP-${poolId}`;
          let decimals = 18;

          try {
            symbol = await client.readContract({
              address: lpTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'symbol',
            });
          } catch (e) {
            console.warn(`[Stargate] Failed to get symbol for LP token ${lpTokenAddress} on ${chain.name}`);
          }

          try {
            decimals = await client.readContract({
              address: lpTokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'decimals',
            });
          } catch (e) {
            console.warn(`[Stargate] Failed to get decimals for LP token ${lpTokenAddress} on ${chain.name}`);
          }

          const amount = parseFloat(formatUnits(stakedAmount, decimals));

          assets.push({
            symbol: `${symbol} (Stargate)`,
            amount,
            price: 0,
            valueUsd: 0,
            source: `Stargate (${chain.name})`,
            type: 'wallet',
            chainId: chain.id,
            chainName: chain.name.toLowerCase(),
            contractAddress: lpTokenAddress,
          });
        } catch (e) {
          // Skip individual pool errors
          continue;
        }
      }
    } catch (e) {
      console.error(`[Stargate] Error processing chain ${chain.name}:`, e);
    }
  }

  return assets;
}
