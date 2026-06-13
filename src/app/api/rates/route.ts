import { NextResponse } from 'next/server';
import { fetchMarketRates } from '@/lib/rates';

export async function GET() {
  try {
    const rates = await fetchMarketRates();
    return NextResponse.json(rates);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rates';
    console.error('[API/Rates] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
