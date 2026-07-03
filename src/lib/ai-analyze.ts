import {
  AiActionStance,
  AiAnalysisResult,
  AiProvider,
  AiSettings,
  DEFAULT_AI_SETTINGS,
  Language,
  PortfolioSnapshot,
} from '@/types';
import { FearGreedIndex } from '@/lib/fear-greed';
import {
  CRYPTO_INVESTMENT_FRAMEWORK,
  CRYPTO_INVESTMENT_OUTPUT_SCHEMA,
} from '@/lib/prompts/crypto-investment-framework';

const PROVIDER_DEFAULTS: Record<
  Exclude<AiProvider, 'custom'>,
  { baseUrl: string; model: string }
> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
  },
};

export function getAiEndpoint(settings: AiSettings): { url: string; model: string } {
  if (settings.provider === 'custom') {
    const base = settings.baseUrl?.trim() || 'http://127.0.0.1:11434/v1/chat/completions';
    return {
      url: base,
      model: settings.model?.trim() || 'llama3',
    };
  }
  const defaults = PROVIDER_DEFAULTS[settings.provider];
  // baseUrl only applies to custom provider — ignore stale overrides
  return {
    url: defaults.baseUrl,
    model: settings.model?.trim() || defaults.model,
  };
}

export function getDefaultModelForProvider(provider: AiProvider): string {
  if (provider === 'custom') return 'llama3';
  return PROVIDER_DEFAULTS[provider].model;
}

/** Normalize settings before API calls (popup → background message). */
export function normalizeAiSettings(settings: AiSettings): AiSettings {
  const provider = settings.provider || 'openai';
  return {
    ...DEFAULT_AI_SETTINGS,
    ...settings,
    provider,
    model: settings.model?.trim() || getDefaultModelForProvider(provider),
    baseUrl: provider === 'custom' ? settings.baseUrl : undefined,
  };
}

export function getProviderHostPermission(
  provider: AiProvider,
  baseUrl?: string
): string | null {
  if (provider === 'openai') return 'https://api.openai.com/*';
  if (provider === 'deepseek') return 'https://api.deepseek.com/*';
  if (!baseUrl?.trim()) return 'http://127.0.0.1/*';
  try {
    const origin = new URL(baseUrl.trim()).origin;
    return `${origin}/*`;
  } catch {
    return null;
  }
}

export function isLocalAiEndpoint(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function serializeSnapshotForAi(
  snapshot: PortfolioSnapshot,
  privacyMode: AiSettings['privacyMode']
): Record<string, unknown> {
  const holdings = snapshot.holdings.map((h) => {
    const row: Record<string, unknown> = {
      symbol: h.symbol,
      pct: Number(h.pct.toFixed(2)),
      venue: h.venue,
    };
    if (privacyMode === 'include_amounts') {
      row.valueUsd = Number(h.valueUsd.toFixed(2));
    }
    return row;
  });

  const payload: Record<string, unknown> = {
    assetCount: snapshot.assetCount,
    holdings,
    concentration: {
      top1Pct: Number(snapshot.concentration.top1Pct.toFixed(2)),
      top3Pct: Number(snapshot.concentration.top3Pct.toFixed(2)),
      hhi: Number(snapshot.concentration.hhi.toFixed(2)),
    },
    venueSplit: {
      cexPct: Number(snapshot.venueSplit.cexPct.toFixed(2)),
      onchainPct: Number(snapshot.venueSplit.onchainPct.toFixed(2)),
    },
    stablecoinPct: Number(snapshot.stablecoinPct.toFixed(2)),
    btcEthPct: Number(snapshot.btcEthPct.toFixed(2)),
    altcoinPct: Number(
      Math.max(0, 100 - snapshot.stablecoinPct - snapshot.btcEthPct).toFixed(2)
    ),
    healthScore: snapshot.healthScore,
    flags: snapshot.flags,
    dataQuality: snapshot.dataQuality,
  };

  if (privacyMode === 'include_amounts') {
    payload.totalUsd = Number(snapshot.totalUsd.toFixed(2));
  }

  return payload;
}

export interface AiMarketContext {
  fearGreed?: Pick<FearGreedIndex, 'value' | 'classification'> | null;
  btcPriceUsd?: number | null;
}

const VALID_STANCES: AiActionStance[] = ['active', 'watch', 'defensive', 'avoid'];

export function normalizeAnalysisResult(
  partial: Partial<AiAnalysisResult> & Pick<AiAnalysisResult, 'healthScore' | 'summary'>
): AiAnalysisResult {
  const stance = VALID_STANCES.includes(partial.actionStance as AiActionStance)
    ? (partial.actionStance as AiActionStance)
    : 'watch';

  return {
    healthScore: partial.healthScore,
    actionStance: stance,
    marketRegime: partial.marketRegime ?? '',
    summary: partial.summary,
    analysisLogic: partial.analysisLogic ?? '',
    marketTiming: partial.marketTiming ?? '',
    portfolioAlignment: partial.portfolioAlignment ?? '',
    risks: partial.risks ?? [],
    suggestions: partial.suggestions ?? [],
    disciplineReminders: partial.disciplineReminders ?? [],
    questionsToConsider: partial.questionsToConsider ?? [],
  };
}

function serializeMarketContext(context?: AiMarketContext): Record<string, unknown> | null {
  if (!context) return null;
  const out: Record<string, unknown> = {};
  if (context.fearGreed) {
    out.fearGreedIndex = context.fearGreed.value;
    out.fearGreedClassification = context.fearGreed.classification;
  }
  if (context.btcPriceUsd != null && context.btcPriceUsd > 0) {
    out.btcPriceUsd = Number(context.btcPriceUsd.toFixed(2));
  }
  if (Object.keys(out).length === 0) return null;
  return out;
}

export function buildAnalysisPrompt(
  snapshot: PortfolioSnapshot,
  settings: AiSettings,
  language: Language,
  marketContext?: AiMarketContext
): { system: string; user: string } {
  const langLabel = language === 'zh' ? '简体中文' : 'English';
  const payload = serializeSnapshotForAi(snapshot, settings.privacyMode);
  const market = serializeMarketContext(marketContext);

  const system = `You are a crypto market and portfolio analyst using the "crypto-investment-analysis" framework (distilled from Lao Gao / 老高 market analysis methodology).
Respond ONLY with valid JSON (no markdown fences).

${CRYPTO_INVESTMENT_FRAMEWORK}

Output schema:
${CRYPTO_INVESTMENT_OUTPUT_SCHEMA}

Rules:
- Write all text fields in ${langLabel}.
- This is NOT financial advice. Do NOT recommend specific buy/sell prices, leverage, or guaranteed returns.
- Never recommend leveraged bottom-fishing (杠杆抄底).
- Use provided fearGreedIndex and btcPriceUsd when present; clearly state when on-chain/ETF/macro data is NOT provided and analysis is partial.
- healthScore: portfolio structure (diversification, concentration, CEX/on-chain, stablecoin buffer, data flags) AND fit with inferred market regime.
- actionStance: active=BTC gate pass + DCA/small add ok; watch=mixed signals; defensive=reduce alt/cex risk; avoid=BTC gate fail (~$50k threat) or extreme risk-off.
- If btcPriceUsd < 52000, treat BTC gate as elevated risk in marketTiming and portfolioAlignment.
- If fearGreedIndex <= 25, discuss sentiment bottom; if >= 75, discuss euphoria/退潮 risk.
- Keep each list item concise (1-2 sentences max).`;

  const userParts = [
    'Analyze current market regime and portfolio fit using the framework. Return JSON only.',
    `Portfolio snapshot:\n${JSON.stringify(payload, null, 2)}`,
  ];
  if (market) {
    userParts.push(`Market context:\n${JSON.stringify(market, null, 2)}`);
  }

  return { system, user: userParts.join('\n\n') };
}

export function parseAnalysisResponse(raw: string): AiAnalysisResult {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('AI returned invalid JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI returned invalid response');
  }

  const obj = parsed as Record<string, unknown>;
  const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  };

  const healthScore =
    typeof obj.healthScore === 'number'
      ? Math.max(0, Math.min(100, Math.round(obj.healthScore)))
      : 0;

  return normalizeAnalysisResult({
    healthScore,
    actionStance:
      typeof obj.actionStance === 'string'
        ? (obj.actionStance as AiActionStance)
        : 'watch',
    marketRegime: typeof obj.marketRegime === 'string' ? obj.marketRegime : '',
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    analysisLogic: typeof obj.analysisLogic === 'string' ? obj.analysisLogic : '',
    marketTiming: typeof obj.marketTiming === 'string' ? obj.marketTiming : '',
    portfolioAlignment:
      typeof obj.portfolioAlignment === 'string' ? obj.portfolioAlignment : '',
    risks: toStringArray(obj.risks),
    suggestions: toStringArray(obj.suggestions),
    disciplineReminders: toStringArray(obj.disciplineReminders),
    questionsToConsider: toStringArray(obj.questionsToConsider),
  });
}

export async function callAiAnalysis(
  snapshot: PortfolioSnapshot,
  settings: AiSettings,
  language: Language,
  marketContext?: AiMarketContext
): Promise<AiAnalysisResult> {
  const normalized = normalizeAiSettings(settings);

  if (!normalized.apiKey.trim() && normalized.provider !== 'custom') {
    throw new Error('API key is required');
  }

  const { url, model } = getAiEndpoint(normalized);
  const { system, user } = buildAnalysisPrompt(
    snapshot,
    normalized,
    language,
    marketContext
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (normalized.apiKey.trim()) {
    headers.Authorization = `Bearer ${normalized.apiKey.trim()}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    let message = body || `AI request failed (${response.status})`;
    try {
      const errJson = JSON.parse(body) as { error?: { message?: string } };
      if (errJson.error?.message) message = errJson.error.message;
    } catch {
      // keep raw body
    }
    const host = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    })();
    throw new Error(`${message} [${host}]`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty AI response');
  }

  return parseAnalysisResponse(content);
}
