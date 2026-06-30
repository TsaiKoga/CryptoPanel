export interface FearGreedIndex {
  value: number;
  classification: string;
  timestamp: number;
  updatedAt: number;
}

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const FNG_API = 'https://api.alternative.me/fng/?limit=1';

export function fearGreedColor(value: number): string {
  if (value <= 24) return '#EA3943';
  if (value <= 44) return '#EA8C00';
  if (value <= 55) return '#F3D42F';
  if (value <= 75) return '#93D900';
  return '#16C784';
}

export function fearGreedClassificationKey(classification: string): string {
  const map: Record<string, string> = {
    'Extreme Fear': 'extremeFear',
    Fear: 'fear',
    Neutral: 'neutral',
    Greed: 'greed',
    'Extreme Greed': 'extremeGreed',
  };
  return map[classification] ?? 'unknown';
}

export async function fetchFearGreedIndex(
  fetchImpl: FetchImpl = fetch
): Promise<FearGreedIndex> {
  const res = await fetchImpl(FNG_API);
  if (!res.ok) {
    throw new Error(`Fear & Greed API failed (${res.status})`);
  }

  const json = (await res.json()) as {
    data?: Array<{
      value?: string;
      value_classification?: string;
      timestamp?: string;
    }>;
  };

  const item = json.data?.[0];
  if (!item?.value) {
    throw new Error('Invalid Fear & Greed API response');
  }

  return {
    value: Math.max(0, Math.min(100, parseInt(item.value, 10) || 0)),
    classification: item.value_classification || 'Unknown',
    timestamp: parseInt(item.timestamp ?? '0', 10) || 0,
    updatedAt: Date.now(),
  };
}
