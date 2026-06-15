"use client"

import { useMemo, useState } from 'react';
import { Asset, AiAnalysisResult, DEFAULT_AI_SETTINGS, PortfolioRiskFlag } from '@/types';
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
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useAssetStore } from '@/components/providers/asset-provider';
import { buildPortfolioSnapshot, snapshotFingerprint } from '@/lib/portfolio-snapshot';
import { normalizeAiSettings } from '@/lib/ai-analyze';
import { aggregateAssetsBySymbol } from '@/lib/asset-aggregate';
import { analyzePortfolio } from '@/lib/api';
import { analysisCache, isChromeExtension } from '@/lib/storage';

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

  const fingerprint = useMemo(() => snapshotFingerprint(snapshot), [snapshot]);

  const flagLabel = (flag: PortfolioRiskFlag) => t(`insights.flags.${flag}`);

  const runAnalysis = async (force = false) => {
    setAnalysisError(null);

    const needsApiKey = ai.provider !== 'custom';
    if (!ai.enabled || (needsApiKey && !ai.apiKey.trim())) {
      setAnalysisError(t('insights.configureAiFirst'));
      setDialogOpen(true);
      return;
    }

    if (!force) {
      const cached = await analysisCache.get(fingerprint);
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
      const result = await analyzePortfolio(snapshot, normalizeAiSettings(ai), language);
      setAnalysis(result);
      await analysisCache.set(fingerprint, result);
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
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto px-7 py-7 sm:px-9 sm:py-8 gap-7">
          <DialogHeader className="gap-3 pb-1 pr-8">
            <DialogTitle className="flex items-center gap-2 text-xl leading-snug">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              {t('insights.dialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pr-1">
              {t('insights.dialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 px-0.5">
            <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl px-5 py-4 leading-relaxed">
              {t('insights.disclaimer')}
            </p>

            {analysisError && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-xl px-5 py-4 leading-relaxed">
                {analysisError}
                {!isChromeExtension && analysisError.includes('extension') && (
                  <p className="mt-3 text-xs text-muted-foreground">{t('aiSettings.webHint')}</p>
                )}
              </div>
            )}

            {analyzing && (
              <div className="flex items-center justify-center gap-3 py-14 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('insights.analyzing')}</span>
              </div>
            )}

            {analysis && !analyzing && (
              <div className="space-y-7 pb-2">
                <div className="flex items-start gap-5 p-6 rounded-xl bg-muted/40">
                  <HealthRing score={analysis.healthScore} />
                  <p className="text-sm leading-relaxed pt-1 pr-1 min-w-0 flex-1">
                    {analysis.summary}
                  </p>
                </div>

                {analysis.risks.length > 0 && (
                  <section className="space-y-3.5 px-1">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      {t('insights.risks')}
                    </h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      {analysis.risks.map((item, i) => (
                        <li key={i} className="pl-5 pr-2 py-1 border-l-2 border-amber-500/30 leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {analysis.suggestions.length > 0 && (
                  <section className="space-y-3.5 px-1">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                      {t('insights.suggestions')}
                    </h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      {analysis.suggestions.map((item, i) => (
                        <li key={i} className="pl-5 pr-2 py-1 border-l-2 border-primary/30 leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {analysis.questionsToConsider.length > 0 && (
                  <section className="space-y-3.5 px-1">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      {t('insights.questions')}
                    </h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      {analysis.questionsToConsider.map((item, i) => (
                        <li key={i} className="pl-5 pr-2 py-1 border-l-2 border-border leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl mt-1"
                  onClick={() => runAnalysis(true)}
                  disabled={analyzing}
                >
                  {t('insights.reanalyze')}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
