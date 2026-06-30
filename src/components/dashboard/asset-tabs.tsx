"use client"

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetTable } from '@/components/dashboard/asset-table';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { Asset } from '@/types';
import { useAssetStore } from '@/components/providers/asset-provider';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/button';
import { Layers, List } from 'lucide-react';
import { aggregateAssetsBySymbol } from '@/lib/asset-aggregate';

export function AssetTabs({
  assets,
  loading,
  aggregateEnabled,
  onToggleAggregate,
}: {
  assets: Asset[];
  loading: boolean;
  aggregateEnabled: boolean;
  onToggleAggregate: () => void;
}) {
  const { exchanges, wallets } = useAssetStore();
  const { t } = useI18n();

  const allAccounts = [
      ...exchanges.map(e => ({ id: e.id, name: e.name, type: 'cex' })),
      ...wallets.map(w => ({ id: w.id, name: w.name, type: 'wallet' }))
  ];
  
  const groupedAssets: Record<string, Asset[]> = {
      'all': assets
  };
  
  allAccounts.forEach(acc => {
      groupedAssets[acc.name] = assets.filter(a => {
          if (acc.type === 'cex') {
              return a.source === acc.name || a.source.startsWith(`${acc.name} ·`);
          } else {
              return a.source === acc.name || a.source.startsWith(`${acc.name} (`);
          }
      });
  });

  const displayedAssetsAll = useMemo(
    () =>
      aggregateEnabled
        ? aggregateAssetsBySymbol(assets, t('assetTable.aggregatedSource'))
        : assets,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aggregateEnabled, assets]
  );

  const displayedAssetsByAccount = useMemo(() => {
    if (!aggregateEnabled) return groupedAssets;

    const next: Record<string, Asset[]> = { all: displayedAssetsAll };
    allAccounts.forEach((acc) => {
      next[acc.name] = aggregateAssetsBySymbol(
        groupedAssets[acc.name] || [],
        t('assetTable.aggregatedSource')
      );
    });
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregateEnabled, displayedAssetsAll, assets, exchanges.length, wallets.length]);

  return (
    <div className="space-y-8">
        <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4 -mx-1 px-1">
                <TabsList className="w-auto inline-flex h-auto p-1.5 bg-muted/50 rounded-lg border border-border/50 backdrop-blur-sm">
                    <TabsTrigger 
                      value="all" 
                      className="px-6 py-3 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md min-w-[6rem]"
                    >
                      {t('tabs.all')}
                    </TabsTrigger>
                    {allAccounts.map(acc => (
                        <TabsTrigger 
                          key={acc.id} 
                          value={acc.name} 
                          className="px-6 py-3 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md min-w-[6rem]"
                        >
                            {acc.name}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <Button
                  variant={aggregateEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={onToggleAggregate}
                  className="h-10 rounded-xl border-2"
                  title={t('assetTable.aggregateToggleDesc')}
                >
                  {aggregateEnabled ? <Layers className="h-4 w-4" /> : <List className="h-4 w-4" />}
                  {t('assetTable.aggregateToggle')}
                </Button>
            </div>
            
            <TabsContent value="all" className="space-y-8 mt-8">
                <SummaryCard assets={displayedAssetsAll} loading={loading} />
                <AssetTable assets={displayedAssetsAll} />
            </TabsContent>
            
            {allAccounts.map(acc => (
                <TabsContent key={acc.id} value={acc.name} className="space-y-8 mt-8">
                    <SummaryCard assets={displayedAssetsByAccount[acc.name] || []} loading={loading} />
                    <AssetTable assets={displayedAssetsByAccount[acc.name] || []} />
                </TabsContent>
            ))}
        </Tabs>
    </div>
  );
}
