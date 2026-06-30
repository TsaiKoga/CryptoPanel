import { FearGreedAlertSettings, Language } from '@/types';
import { FearGreedIndex, fearGreedClassificationKey } from '@/lib/fear-greed';

export const FEAR_GREED_ALERT_ALARM = 'fearGreedAlert';
export const FEAR_GREED_ALERT_CHECK_INTERVAL_MINUTES = 120;

export const DEFAULT_FEAR_GREED_ALERT_SETTINGS: FearGreedAlertSettings = {
  enabled: false,
  alertBelow: 8,
  alertAbove: 90,
};

export interface FearGreedAlertState {
  indexTimestamp: number;
  notifiedBelow: boolean;
  notifiedAbove: boolean;
}

export function normalizeFearGreedAlertSettings(
  input?: Partial<FearGreedAlertSettings> | null
): FearGreedAlertSettings {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const parseThreshold = (
    value: unknown,
    defaultValue: number | null
  ): number | null => {
    if (value === null || value === '') return null;
    if (value === undefined) return defaultValue;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    if (Number.isNaN(n)) return defaultValue;
    return clamp(n);
  };

  return {
    enabled: input?.enabled ?? DEFAULT_FEAR_GREED_ALERT_SETTINGS.enabled,
    alertBelow: parseThreshold(input?.alertBelow, DEFAULT_FEAR_GREED_ALERT_SETTINGS.alertBelow),
    alertAbove: parseThreshold(input?.alertAbove, DEFAULT_FEAR_GREED_ALERT_SETTINGS.alertAbove),
  };
}

export function shouldAlertBelow(
  value: number,
  settings: FearGreedAlertSettings
): boolean {
  return (
    settings.enabled &&
    settings.alertBelow !== null &&
    value < settings.alertBelow
  );
}

export function shouldAlertAbove(
  value: number,
  settings: FearGreedAlertSettings
): boolean {
  return (
    settings.enabled &&
    settings.alertAbove !== null &&
    value > settings.alertAbove
  );
}

export type FearGreedAlertKind = 'below' | 'above';

export interface FearGreedAlertDecision {
  kind: FearGreedAlertKind;
  title: string;
  message: string;
}

export function buildAlertNotifications(
  index: FearGreedIndex,
  settings: FearGreedAlertSettings,
  language: Language,
  state: FearGreedAlertState
): FearGreedAlertDecision[] {
  const isNewIndexDay = index.timestamp > state.indexTimestamp;
  const notifiedBelow = isNewIndexDay ? false : state.notifiedBelow;
  const notifiedAbove = isNewIndexDay ? false : state.notifiedAbove;

  const classKey = fearGreedClassificationKey(index.classification);
  const zh = language === 'zh';
  const label = zh
    ? ({
        extremeFear: '极度恐慌',
        fear: '恐慌',
        neutral: '中性',
        greed: '贪婪',
        extremeGreed: '极度贪婪',
        unknown: '未知',
      }[classKey] ?? index.classification)
  : index.classification;

  const decisions: FearGreedAlertDecision[] = [];

  if (shouldAlertBelow(index.value, settings) && !notifiedBelow) {
    decisions.push({
      kind: 'below',
      title: zh ? '恐慌贪婪指数 — 低于阈值' : 'Fear & Greed — Below threshold',
      message: zh
        ? `当前指数 ${index.value}（${label}），低于您设置的 ${settings.alertBelow}。`
        : `Index is ${index.value} (${label}), below your threshold of ${settings.alertBelow}.`,
    });
  }

  if (shouldAlertAbove(index.value, settings) && !notifiedAbove) {
    decisions.push({
      kind: 'above',
      title: zh ? '恐慌贪婪指数 — 高于阈值' : 'Fear & Greed — Above threshold',
      message: zh
        ? `当前指数 ${index.value}（${label}），高于您设置的 ${settings.alertAbove}。`
        : `Index is ${index.value} (${label}), above your threshold of ${settings.alertAbove}.`,
    });
  }

  return decisions;
}

export function nextAlertState(
  current: FearGreedAlertState,
  index: FearGreedIndex,
  fired: FearGreedAlertKind[]
): FearGreedAlertState {
  const isNewIndexDay = index.timestamp > current.indexTimestamp;
  return {
    indexTimestamp: index.timestamp,
    notifiedBelow:
      (isNewIndexDay ? false : current.notifiedBelow) || fired.includes('below'),
    notifiedAbove:
      (isNewIndexDay ? false : current.notifiedAbove) || fired.includes('above'),
  };
}
