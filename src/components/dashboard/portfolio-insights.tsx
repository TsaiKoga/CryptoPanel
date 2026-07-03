"use client"

import { useMemo, useState } from 'react';
import { Asset, AiActionStance, AiAnalysisResult, DEFAULT_AI_SETTINGS, PortfolioRiskFlag } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  Shield,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Loader2,
  GitBranch,
  TrendingUp,
  Scale,
  BookOpen,
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useAssetStore } from '@/components/providers/asset-provider';
import { buildPortfolioSnapshot, analysisFingerprint } from '@/lib/portfolio-snapshot';
import { normalizeAiSettings } from '@/lib/ai-analyze';
import { aggregateAssetsBySymbol } from '@/lib/asset-aggregate';
import { analyzePortfolio, fetchFearGreedIndex, fetchMarketRates } from '@/lib/api';
import { analysisCache, isChromeExtension } from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import './portfolio-insights-dialog.css';

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function scoreRingColor(score: number): string {
  if (score >= 75) return 'stroke-emerald-500';
  if (score >= 50) return 'stroke-amber-500';
  return 'stroke-red-500';
}

function stanceStyles(stance: AiActionStance): string {
  switch (stance) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
    case 'watch':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25';
    case 'defensive':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25';
    case 'avoid':
      return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function AnalysisSection({
  icon,
  title,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-insights-dialog-section
      className={cn(
        'rounded-xl border border-border/50 bg-muted/25',
        className
      )}
    >
      <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function AnalysisList({ items, accent }: { items: string[]; accent?: 'amber' | 'primary' | 'muted' }) {
  const borderClass =
    accent === 'amber'
      ? 'border-amber-500/35'
      : accent === 'primary'
        ? 'border-primary/35'
        : 'border-border/70';

  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li
          key={i}
          className={cn(
            'text-sm text-muted-foreground leading-relaxed pl-4 border-l-2',
            borderClass
          )}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function HealthRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative h-24 w-24 flex-shrink-0">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-muted"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={scoreRingColor(score)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
      </div>
    </div>
  );
}

export function PortfolioInsights({
  assets,
  loading,
}: {
  assets: Asset[];
  loading: boolean;
}) {
  const { t, language } = useI18n();
  const { settings } = useAssetStore();
  const ai = { ...DEFAULT_AI_SETTINGS, ...settings.ai };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);

  const aggregatedAssets = useMemo(
    () => aggregateAssetsBySymbol(assets, t('assetTable.aggregatedSource')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assets]
  );

  const snapshot = useMemo(
    () => buildPortfolioSnapshot(aggregatedAssets),
    [aggregatedAssets]
  );

  const flagLabel = (flag: PortfolioRiskFlag) => t(`insights.flags.${flag}`);
  const stanceLabel = (stance: AiActionStance) => t(`insights.actionStance.${stance}`);

  const runAnalysis = async (force = false) => {
    setAnalysisError(null);

    const needsApiKey = ai.provider !== 'custom';
    if (!ai.enabled || (needsApiKey && !ai.apiKey.trim())) {
      setAnalysisError(t('insights.configureAiFirst'));
      setDialogOpen(true);
      return;
    }

    let fearGreedValue: number | null = null;
    let marketContext: { fearGreed?: { value: number; classification: string }; btcPriceUsd?: number } = {};

    try {
      const [fng, rates] = await Promise.all([
        fetchFearGreedIndex().catch(() => null),
        fetchMarketRates().catch(() => null),
      ]);
      if (fng) {
        fearGreedValue = fng.value;
        marketContext.fearGreed = { value: fng.value, classification: fng.classification };
      }
      if (rates?.btcPrice) {
        marketContext.btcPriceUsd = rates.btcPrice;
      }
    } catch {
      // proceed without market context
    }

    const cacheKey = analysisFingerprint(snapshot, fearGreedValue);

    if (!force) {
      const cached = await analysisCache.get(cacheKey);
      if (cached) {
        setAnalysis(cached);
        setDialogOpen(true);
        return;
      }
    }

    setDialogOpen(true);
    setAnalyzing(true);
    setAnalysis(null);

    try {
      const result = await analyzePortfolio(
        snapshot,
        normalizeAiSettings(ai),
        language,
        Object.keys(marketContext).length > 0 ? marketContext : undefined
      );
      setAnalysis(result);
      await analysisCache.set(cacheKey, result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setAnalysisError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (snapshot.totalUsd <= 0 && !loading) {
    return null;
  }

  return (
    <>
      <Card className="relative border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm shadow-lg">
        <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none overflow-hidden" />
        <CardHeader className="relative px-6 pb-4 pt-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="truncate">{t('insights.title')}</CardTitle>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-2 shrink-0"
              disabled={loading || analyzing}
              onClick={() => runAnalysis(false)}
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {t('insights.analyze')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative px-6 pt-0 pb-6 space-y-5">
          <div className="flex items-start gap-5 sm:gap-6">
            <HealthRing score={snapshot.healthScore} />
            <div className="space-y-3 flex-1 min-w-0 pt-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t('insights.healthScore')}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('insights.cexPct')}</p>
                  <p className="text-sm font-medium tabular-nums">
                    {snapshot.venueSplit.cexPct.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('insights.stablecoinPct')}</p>
                  <p className="text-sm font-medium tabular-nums">
                    {snapshot.stablecoinPct.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('insights.top1Pct')}</p>
                  <p className="text-sm font-medium tabular-nums">
                    {snapshot.concentration.top1Pct.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('insights.btcEthPct')}</p>
                  <p className="text-sm font-medium tabular-nums">
                    {snapshot.btcEthPct.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {snapshot.flags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {snapshot.flags.map((flag) => (
                <span
                  key={flag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {flagLabel(flag)}
                </span>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('insights.localHint')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-insights-analysis-dialog
          className="max-w-xl border-border/60 shadow-xl"
        >
          <DialogHeader data-insights-dialog-header className="space-y-2">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold leading-snug sm:text-xl">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </span>
              {t('insights.dialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {t('insights.dialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <div data-insights-dialog-body>
            <div data-insights-dialog-stack>
              <p
                data-insights-dialog-disclaimer
                className="text-sm text-amber-800 dark:text-amber-200/90 border border-amber-500/25 bg-amber-500/5"
              >
                {t('insights.disclaimer')}
              </p>

              {analysisError && (
                <div
                  data-insights-dialog-error
                  className="rounded-xl border border-destructive/30 bg-destructive/10 text-sm text-destructive"
                >
                  {analysisError}
                  {!isChromeExtension && analysisError.includes('extension') && (
                    <p className="mt-2.5 text-xs text-muted-foreground">{t('aiSettings.webHint')}</p>
                  )}
                </div>
              )}

              {analyzing && (
                <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t('insights.analyzing')}</span>
                </div>
              )}

              {analysis && !analyzing && (
                <div data-insights-dialog-stack>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                        stanceStyles(analysis.actionStance)
                      )}
                    >
                      {stanceLabel(analysis.actionStance)}
                    </span>
                    {analysis.marketRegime && (
                      <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                        {analysis.marketRegime}
                      </span>
                    )}
                  </div>

                  <div
                    data-insights-dialog-summary
                    className="rounded-xl border border-border/50 bg-muted/30"
                  >
                    <HealthRing score={analysis.healthScore} />
                    <p className="min-w-0 flex-1 pt-1 text-sm leading-relaxed text-foreground/90">
                      {analysis.summary}
                    </p>
                  </div>

                  {analysis.analysisLogic && (
                    <AnalysisSection
                      icon={<GitBranch className="h-4 w-4 text-primary shrink-0" />}
                      title={t('insights.analysisLogic')}
                    >
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {analysis.analysisLogic}
                      </p>
                    </AnalysisSection>
                  )}

                  {analysis.marketTiming && (
                    <AnalysisSection
                      icon={<TrendingUp className="h-4 w-4 text-primary shrink-0" />}
                      title={t('insights.marketTiming')}
                    >
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {analysis.marketTiming}
                      </p>
                    </AnalysisSection>
                  )}

                  {analysis.portfolioAlignment && (
                    <AnalysisSection
                      icon={<Scale className="h-4 w-4 text-primary shrink-0" />}
                      title={t('insights.portfolioAlignment')}
                    >
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {analysis.portfolioAlignment}
                      </p>
                    </AnalysisSection>
                  )}

                  {analysis.risks.length > 0 && (
                    <AnalysisSection
                      icon={<AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                      title={t('insights.risks')}
                      className="border-amber-500/20 bg-amber-500/5"
                    >
                      <AnalysisList items={analysis.risks} accent="amber" />
                    </AnalysisSection>
                  )}

                  {analysis.suggestions.length > 0 && (
                    <AnalysisSection
                      icon={<Lightbulb className="h-4 w-4 text-primary shrink-0" />}
                      title={t('insights.suggestions')}
                    >
                      <AnalysisList items={analysis.suggestions} accent="primary" />
                    </AnalysisSection>
                  )}

                  {analysis.disciplineReminders.length > 0 && (
                    <AnalysisSection
                      icon={<BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />}
                      title={t('insights.disciplineReminders')}
                    >
                      <AnalysisList items={analysis.disciplineReminders} accent="muted" />
                    </AnalysisSection>
                  )}

                  {analysis.questionsToConsider.length > 0 && (
                    <AnalysisSection
                      icon={<HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                      title={t('insights.questions')}
                    >
                      <AnalysisList items={analysis.questionsToConsider} accent="muted" />
                    </AnalysisSection>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    onClick={() => runAnalysis(true)}
                    disabled={analyzing}
                  >
                    {t('insights.reanalyze')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
