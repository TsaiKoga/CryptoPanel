import { NextResponse } from 'next/server';
import { fetchPricesForAssets } from '@/lib/asset-prices';

export async function POST(request: Request) {
  try {
    const { assets } = await request.json();

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    const prices = await fetchPricesForAssets(assets);
    return NextResponse.json({ prices });
  } catch (error: unknown) {
    console.error('Price API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
