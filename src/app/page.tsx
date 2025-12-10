"use client"

import { useAssetFetcher } from '@/hooks/use-asset-fetcher';
import { AssetDistribution } from '@/components/dashboard/asset-distribution';
import { AssetTabs } from '@/components/dashboard/asset-tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Settings, RefreshCw } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Dashboard() {
  const { assets, loading, error, refresh } = useAssetFetcher();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">CryptoPanel 资产看板</h1>
        <div className="flex space-x-2">
          <ThemeToggle />
          <Button variant="outline" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/settings">
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <AssetTabs assets={assets} loading={loading} />
        </div>
        <div>
            <AssetDistribution assets={assets} />
        </div>
      </div>
    </div>
  );
}
