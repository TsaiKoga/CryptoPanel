import { NextResponse } from 'next/server';
import { fetchFearGreedIndex } from '@/lib/fear-greed';

export async function GET() {
  try {
    const index = await fetchFearGreedIndex();
    return NextResponse.json(index);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Fear & Greed Index';
    console.error('[API/FearGreed] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
