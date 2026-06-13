import { NextResponse } from 'next/server';
import { fetchSolanaAssetsCore } from '@/lib/solana-core';

export async function POST(request: Request) {
  try {
    const { address, walletName, rpcUrl } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    const rpcOverride = typeof rpcUrl === 'string' ? rpcUrl.trim() : undefined;
    const assets = await fetchSolanaAssetsCore(address, walletName, rpcOverride);
    return NextResponse.json({ assets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Solana assets';
    console.error('[API/Solana] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
