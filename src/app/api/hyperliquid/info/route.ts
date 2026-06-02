import { NextResponse } from 'next/server';

const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `Hyperliquid upstream error: ${res.status} ${res.statusText}`, details: text },
        { status: res.status }
      );
    }

    // Hyperliquid returns JSON.
    return new NextResponse(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hyperliquid proxy error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

