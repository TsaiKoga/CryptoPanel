import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

const VOTER = '0x16613524e02ad97eDfeF371bC883F2F5d6C480A5';
const VE_AERO = '0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4';
const SUGAR_HELPER = '0x2073D803589690333d3143dC945Db013638011D4'; // I suspect this is Sugar

async function check() {
  try {
    const voterCode = await client.getBytecode({ address: VOTER });
    console.log('Voter Code Exists:', !!voterCode && voterCode !== '0x');

    const veCode = await client.getBytecode({ address: VE_AERO });
    console.log('veAERO Code Exists:', !!veCode && veCode !== '0x');

    // Try to read `length()` from Voter (number of pools)
    const abi = parseAbi(['function length() view returns (uint256)']);
    try {
        const length = await client.readContract({
            address: VOTER,
            abi,
            functionName: 'length'
        });
        console.log('Voter Pool Length:', length.toString());
    } catch (e) {
        console.log('Voter length read failed:', e.message);
    }
    
    // Check Sugar helper
    const sugarCode = await client.getBytecode({ address: SUGAR_HELPER });
    console.log('Sugar Code Exists:', !!sugarCode && sugarCode !== '0x');

  } catch (e) {
    console.error('Error:', e);
  }
}

check();


