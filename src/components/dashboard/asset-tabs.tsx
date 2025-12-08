"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetTable } from '@/components/dashboard/asset-table';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { Asset } from '@/types';
import { useAssetStore } from '@/components/providers/asset-provider';
import { Card, CardContent } from "@/components/ui/card";

export function AssetTabs({ assets, loading }: { assets: Asset[], loading: boolean }) {
  const { exchanges, wallets } = useAssetStore();

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
              return a.source === acc.name;
          } else {
              return a.source === acc.name || a.source.startsWith(`${acc.name} (`);
          }
      });
  });

  return (
    <div className="mt-6 space-y-6">
        <Tabs defaultValue="all" className="w-full">
            <div className="overflow-x-auto pb-4">
                <TabsList className="w-auto inline-flex h-auto p-1 bg-muted rounded-md">
                    <TabsTrigger value="all" className="px-4 py-2">全部汇总</TabsTrigger>
                    {allAccounts.map(acc => (
                        <TabsTrigger key={acc.id} value={acc.name} className="px-4 py-2">
                            {acc.name}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
            
            <TabsContent value="all" className="space-y-6">
                <SummaryCard assets={assets} loading={loading} />
                <Card>
                    <CardContent className="p-0">
                         <AssetTable assets={assets} />
                    </CardContent>
                </Card>
            </TabsContent>
            
            {allAccounts.map(acc => (
                <TabsContent key={acc.id} value={acc.name} className="space-y-6">
                    <SummaryCard assets={groupedAssets[acc.name] || []} loading={loading} />
                    <Card>
                        <CardContent className="p-0">
                            <AssetTable assets={groupedAssets[acc.name] || []} />
                        </CardContent>
                    </Card>
                </TabsContent>
            ))}
        </Tabs>
    </div>
  );
}
