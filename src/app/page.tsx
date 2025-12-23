"use client"

import { useAssetFetcher } from '@/hooks/use-asset-fetcher';
import { AssetDistribution } from '@/components/dashboard/asset-distribution';
import { AssetTabs } from '@/components/dashboard/asset-tabs';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { isChromeExtension } from '@/lib/storage';

export default function Dashboard() {
  const { assets, loading, error, refresh } = useAssetFetcher();

  const openSettings = () => {
    if (isChromeExtension) {
      chrome.runtime.openOptionsPage();
    } else {
      window.location.href = '/settings';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* 精美的头部 */}
        <div className="flex items-start justify-between pb-8 border-b border-border/60">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                  CryptoPanel
                </h1>
                <p className="text-lg font-medium text-muted-foreground mt-1">
                  资产看板
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-14">
              统一管理您的加密货币资产
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={refresh} 
              disabled={loading}
              className="h-10 w-10 rounded-xl border-2 hover:border-primary/50 transition-all"
            >
              <RefreshCw 
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                style={{
                  color: 'var(--foreground)',
                  stroke: 'var(--foreground)',
                }}
              />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={openSettings}
              className="h-10 w-10 rounded-xl border-2 hover:border-primary/50 transition-all"
            >
              <Settings 
                className="h-4 w-4"
                style={{
                  color: 'var(--foreground)',
                  stroke: 'var(--foreground)',
                }}
              />
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent border-l-4 border-destructive p-5 rounded-xl shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              <p className="font-medium text-destructive">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <AssetTabs assets={assets} loading={loading} />
          </div>
          <div className="space-y-8">
            <AssetDistribution assets={assets} />
          </div>
        </div>
      </div>
    </div>
  );
}
