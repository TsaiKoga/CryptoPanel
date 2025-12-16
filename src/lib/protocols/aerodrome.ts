import { parseAbi, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { Asset } from '@/types';
import { getBaseClient } from '@/lib/rpc';

const VOTER_ADDRESS = '0x16613524e02ad97eDfeF371bC883F2F5d6C480A5'; // Base Voter
const AERO_TOKEN_ADDRESS = '0x940181a94A35A4569E4529A3CDfB74e38FD98631';

const VOTER_ABI = parseAbi([
  'function length() view returns (uint256)',
  'function pools(uint256) view returns (address)',
  'function gauges(address) view returns (address)',
  'function ve() view returns (address)',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
]);

const VE_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function tokenOfOwnerByIndex(address, uint256) view returns (uint256)',
  'function locked(uint256) view returns (int128, uint256)', // amount, end
]);

const POOL_ABI = parseAbi([
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function token0() view returns (address)',
    'function token1() view returns (address)',
    'function reserve0() view returns (uint256)',
    'function reserve1() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
]);

// Helper to get AERO price (approximate or via API in main app, here just returning asset)
// We rely on the main app's price fetcher which uses symbol/address.

export async function fetchAerodromeAssets(address: string): Promise<Asset[]> {
  const assets: Asset[] = [];
  
  if (!address.startsWith('0x') || address.length !== 42) {
    return [];
  }

  const client = getBaseClient();

  try {
    // 1. Fetch veAERO (Locked AERO)
    const veAddress = await client.readContract({
      address: VOTER_ADDRESS,
      abi: VOTER_ABI,
      functionName: 've',
    });

    const veBalance = await client.readContract({
      address: veAddress,
      abi: VE_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    if (veBalance > 0n) {
      let totalLocked = 0n;
      // Fetch each NFT
      for (let i = 0; i < Number(veBalance); i++) {
        try {
            const tokenId = await client.readContract({
                address: veAddress,
                abi: VE_ABI,
                functionName: 'tokenOfOwnerByIndex',
                args: [address as `0x${string}`, BigInt(i)],
            });
            
            const locked = await client.readContract({
                address: veAddress,
                abi: VE_ABI,
                functionName: 'locked',
                args: [tokenId],
            });
            
            // locked returns (amount, end)
            // Note: abi defines amount as int128, so we cast. It is actually int128 but represents uint usually.
            const amount = locked[0]; 
            totalLocked += BigInt(amount);
        } catch (e) {
            console.error('Error fetching veAERO token', i, e);
        }
      }

      if (totalLocked > 0n) {
          assets.push({
              symbol: 'veAERO',
              amount: parseFloat(formatUnits(totalLocked, 18)),
              valueUsd: 0,
              price: 0,
              source: 'Aerodrome (Locked)',
              type: 'wallet',
              chainId: base.id,
              chainName: 'base',
              contractAddress: veAddress,
          });
      }
    }

    // 2. Iterate Pools (Limit to first 30 for MVP performance)
    // Ideally we use a Sugar helper or Indexer.
    const poolCount = await client.readContract({
        address: VOTER_ADDRESS,
        abi: VOTER_ABI,
        functionName: 'length',
    });

    const limit = Math.min(Number(poolCount), 30); // Check top 30 pools
    
    // Also fetch AERO balance
    try {
        const aeroBalance = await client.readContract({
            address: AERO_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
        });
        if (aeroBalance > 0n) {
            assets.push({
                symbol: 'AERO',
                amount: parseFloat(formatUnits(aeroBalance, 18)),
                valueUsd: 0,
                price: 0,
                source: 'Wallet (Base)',
                type: 'wallet',
                chainId: base.id,
                chainName: 'base',
                contractAddress: AERO_TOKEN_ADDRESS,
            });
        }
    } catch (e) {
        console.error('Error fetching AERO balance', e);
    }

    // Iterate pools
    // We can run these in parallel batches
    const poolPromises = [];
    for (let i = 0; i < limit; i++) {
        poolPromises.push(async () => {
            try {
                const poolAddress = await client.readContract({
                    address: VOTER_ADDRESS,
                    abi: VOTER_ABI,
                    functionName: 'pools',
                    args: [BigInt(i)],
                });

                // Get Gauge
                const gaugeAddress = await client.readContract({
                    address: VOTER_ADDRESS,
                    abi: VOTER_ABI,
                    functionName: 'gauges',
                    args: [poolAddress],
                });

                // Check Unstaked LP Balance
                let lpBalance = 0n;
                try {
                    lpBalance = await client.readContract({
                        address: poolAddress,
                        abi: ERC20_ABI,
                        functionName: 'balanceOf',
                        args: [address as `0x${string}`],
                    });
                } catch (e) {
                    console.warn(`[Aerodrome] Failed to fetch LP balance for pool ${poolAddress}:`, e);
                }

                // Check Staked LP Balance (Gauge)
                let stakedBalance = 0n;
                if (gaugeAddress !== '0x0000000000000000000000000000000000000000') {
                    try {
                        stakedBalance = await client.readContract({
                            address: gaugeAddress,
                            abi: ERC20_ABI,
                            functionName: 'balanceOf',
                            args: [address as `0x${string}`],
                        });
                    } catch (e) {
                        console.warn(`[Aerodrome] Failed to fetch staked balance for gauge ${gaugeAddress}:`, e);
                    }
                }

                if (lpBalance > 0n || stakedBalance > 0n) {
                    // Get Pool Symbol and Decimals
                    let symbol = `LP-${poolAddress.slice(0, 6)}...`; // Fallback symbol
                    let decimals = 18; // Default decimals
                    
                    try {
                        symbol = await client.readContract({
                            address: poolAddress,
                            abi: ERC20_ABI,
                            functionName: 'symbol',
                        });
                    } catch (e) {
                        console.warn(`[Aerodrome] Failed to fetch symbol for pool ${poolAddress}:`, e);
                    }

                    try {
                        decimals = await client.readContract({
                            address: poolAddress,
                            abi: ERC20_ABI,
                            functionName: 'decimals',
                        });
                    } catch (e) {
                        console.warn(`[Aerodrome] Failed to fetch decimals for pool ${poolAddress}, using default 18:`, e);
                    }

                    // Add Unstaked
                    if (lpBalance > 0n) {
                        const amount = parseFloat(formatUnits(lpBalance, decimals));
                        console.log(`[Aerodrome] Found unstaked LP: ${symbol} = ${amount}`);
                        assets.push({
                            symbol: symbol, // e.g. vAMM-AERO/USDC
                            amount: amount,
                            valueUsd: 0,
                            price: 0,
                            source: 'Aerodrome (Wallet)',
                            type: 'wallet',
                            chainId: base.id,
                            chainName: 'base',
                            contractAddress: poolAddress,
                        });
                    }

                    // Add Staked
                    if (stakedBalance > 0n) {
                        const amount = parseFloat(formatUnits(stakedBalance, decimals));
                        console.log(`[Aerodrome] Found staked LP: ${symbol} = ${amount}`);
                        assets.push({
                            symbol: `${symbol} (Staked)`,
                            amount: amount,
                            valueUsd: 0,
                            price: 0,
                            source: 'Aerodrome (Gauge)',
                            type: 'wallet',
                            chainId: base.id,
                            chainName: 'base',
                            contractAddress: gaugeAddress,
                        });
                    }
                }
            } catch (e) {
                console.warn(`[Aerodrome] Error processing pool ${i}:`, e);
            }
        });
    }

    // Execute batches of 5 with delay between batches
    for (let i = 0; i < poolPromises.length; i += 5) {
        const batch = poolPromises.slice(i, i + 5);
        await Promise.all(batch.map(p => p()));
        // Add delay between batches to avoid rate limiting
        if (i + 5 < poolPromises.length) {
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }

  } catch (e) {
    console.error('Error fetching Aerodrome assets:', e);
  }

  return assets;
}

