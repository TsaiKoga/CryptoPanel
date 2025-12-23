import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Asset } from '@/types';
import { TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';

export function SummaryCard({ assets, loading }: { assets: Asset[], loading: boolean }) {
  const totalValue = assets.reduce((sum, asset) => sum + asset.valueUsd, 0);
  const assetCount = assets.length;

  return (
    <Card className="relative overflow-hidden border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 group">
      {/* 渐变背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      
      <CardHeader 
        className="relative flex flex-row items-center justify-between space-y-0 pb-6"
        style={{ padding: '2rem 2rem 1.5rem 2rem' }}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              总资产估值
            </CardTitle>
            <p className="text-xs text-muted-foreground/70 mt-0.5">USD</p>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-muted/50">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent 
        className="relative"
        style={{ padding: '0 2rem 2rem 2rem' }}
      >
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <div className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/95 to-foreground/80 bg-clip-text text-transparent">
              {loading ? (
                <span className="inline-flex items-center gap-2 text-3xl">
                  <span className="animate-pulse">计算中...</span>
                </span>
              ) : (
                `$${totalValue.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}`
              )}
            </div>
            {!loading && totalValue > 0 && (
              <ArrowUpRight className="h-5 w-5 text-primary/70" />
            )}
          </div>
          <div className="flex items-center gap-2.5 pt-2 border-t border-border/50">
            <div className="h-2 w-2 rounded-full bg-primary shadow-lg shadow-primary/50 animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">
              包含 <span className="text-foreground font-semibold">{assetCount}</span> 个资产
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

