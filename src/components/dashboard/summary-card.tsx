import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Asset } from '@/types';

export function SummaryCard({ assets, loading }: { assets: Asset[], loading: boolean }) {
  const totalValue = assets.reduce((sum, asset) => sum + asset.valueUsd, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">总资产估值 (USD)</CardTitle>
        <span className="text-2xl font-bold">$</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? "计算中..." : `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </div>
        <p className="text-xs text-muted-foreground">
          包含 {assets.length} 个资产
        </p>
      </CardContent>
    </Card>
  );
}

