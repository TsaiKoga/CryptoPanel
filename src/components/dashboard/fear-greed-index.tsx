"use client"

import { useEffect, useState } from 'react';
import { Gauge, ExternalLink, Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { fetchFearGreedIndex } from '@/lib/api';
import {
  fearGreedClassificationKey,
  fearGreedColor,
  type FearGreedIndex,
} from '@/lib/fear-greed';
import { fearGreedCache } from '@/lib/storage';

const SCALE_STOPS = [
  { pct: 12, color: '#EA3943' },
  { pct: 34, color: '#EA8C00' },
  { pct: 50, color: '#F3D42F' },
  { pct: 68, color: '#93D900' },
  { pct: 88, color: '#16C784' },
];

function formatIndexDate(timestamp: number, locale: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function FearGreedIndexCard() {
  const { t, language } = useI18n();
  const [data, setData] = useState<FearGreedIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);
      const cached = await fearGreedCache.get();
      if (cached && !cancelled) {
        setData(cached);
        setLoading(false);
      } else if (!cached) {
        setLoading(true);
      }

      try {
        const fresh = await fetchFearGreedIndex();
        if (cancelled) return;
        setData(fresh);
        await fearGreedCache.set(fresh);
      } catch (e) {
        if (!cancelled && !cached) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = data?.value ?? 0;
  const color = fearGreedColor(value);
  const classKey = data ? fearGreedClassificationKey(data.classification) : 'unknown';
  const label = t(`fearGreed.${classKey}`);

  return (
    <div
      data-dashboard-card
      className="relative rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm shadow-lg overflow-hidden"
      style={{ padding: '1.5rem' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        {/* 标题行 */}
        <div
          className="flex items-center justify-between gap-3"
          style={{ marginBottom: '1.25rem' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Gauge className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold leading-snug truncate">{t('fearGreed.title')}</h3>
          </div>
          <a
            href="https://alternative.me/crypto/fear-and-greed-index/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-1"
            title={t('fearGreed.source')}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {loading && !data && (
          <div
            className="flex items-center justify-center gap-2 text-muted-foreground"
            style={{ paddingTop: '2rem', paddingBottom: '2rem' }}
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t('dashboard.loading')}</span>
          </div>
        )}

        {error && !data && (
          <p className="text-sm text-destructive leading-relaxed">{error}</p>
        )}

        {data && (
          <>
            {/* 数值 + 状态 + 日期 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="flex items-baseline gap-3 flex-wrap">
                <p
                  className="text-4xl font-bold tabular-nums leading-none tracking-tight"
                  style={{ color }}
                >
                  {value}
                </p>
                <p className="text-sm font-medium leading-snug" style={{ color }}>
                  {label}
                </p>
              </div>
              {data.timestamp > 0 && (
                <p
                  className="text-xs text-muted-foreground leading-relaxed"
                  style={{ marginTop: '0.625rem' }}
                >
                  {t('fearGreed.asOf', {
                    date: formatIndexDate(data.timestamp, language),
                  })}
                </p>
              )}
            </div>

            {/* 渐变滑条 */}
            <div style={{ marginBottom: '1rem' }}>
              <div className="relative" style={{ height: '1.25rem', marginBottom: '0.625rem' }}>
                <div
                  className="absolute inset-x-0 rounded-full"
                  style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '0.625rem',
                    background:
                      'linear-gradient(to right, #EA3943 0%, #EA8C00 25%, #F3D42F 50%, #93D900 75%, #16C784 100%)',
                  }}
                />
                <div
                  className="absolute rounded-full border-2 border-background shadow-md"
                  style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '1rem',
                    width: '1rem',
                    left: `max(0px, min(calc(100% - 16px), calc(${value}% - 8px)))`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('fearGreed.scaleFear')}</span>
                <span>{t('fearGreed.scaleGreed')}</span>
              </div>
            </div>

            {/* 分段色条 */}
            <div className="flex gap-1.5" style={{ marginBottom: '1.25rem' }}>
              {SCALE_STOPS.map((stop) => (
                <div
                  key={stop.pct}
                  className="flex-1 min-w-0 rounded-full opacity-90"
                  style={{ height: '0.375rem', backgroundColor: stop.color }}
                />
              ))}
            </div>

            {/* 数据来源 */}
            <div
              className="border-t border-border/50"
              style={{ paddingTop: '1rem' }}
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('fearGreed.source')}:{' '}
                <a
                  href="https://alternative.me/crypto/fear-and-greed-index/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-primary"
                >
                  Alternative.me
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
