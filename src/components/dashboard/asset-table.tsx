import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Asset } from '@/types';
import { ExternalLink, TrendingUp } from 'lucide-react';

export function AssetTable({ assets }: { assets: Asset[] }) {
  return (
    <div className="rounded-2xl border-2 border-border/50 overflow-hidden bg-card/80 backdrop-blur-sm shadow-xl">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-muted/50 via-muted/30 to-transparent border-b-2 border-border/60 hover:bg-muted/50">
              <TableHead 
                className="font-bold text-xs uppercase tracking-wider"
                style={{ padding: '1.75rem 2rem' }}
              >
                币种
              </TableHead>
              <TableHead 
                className="font-bold text-xs uppercase tracking-wider text-right"
                style={{ padding: '1.75rem 2rem' }}
              >
                数量
              </TableHead>
              <TableHead 
                className="font-bold text-xs uppercase tracking-wider text-right"
                style={{ padding: '1.75rem 2rem' }}
              >
                单价 (USD)
              </TableHead>
              <TableHead 
                className="font-bold text-xs uppercase tracking-wider text-right"
                style={{ padding: '1.75rem 2rem' }}
              >
                总值 (USD)
              </TableHead>
              <TableHead 
                className="font-bold text-xs uppercase tracking-wider"
                style={{ padding: '1.75rem 2rem' }}
              >
                来源
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset, index) => (
              <TableRow 
                key={index}
                className="group border-b border-border/30 hover:bg-gradient-to-r hover:from-primary/5 hover:via-transparent hover:to-transparent transition-all duration-200"
              >
                <TableCell 
                  className="font-semibold"
                  style={{ padding: '1.5rem 2rem' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-3 w-3 rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/50 group-hover:scale-125 transition-transform" />
                      <div className="absolute inset-0 h-3 w-3 rounded-full bg-primary/30 animate-ping" />
                    </div>
                    <span className="font-bold text-base">{asset.symbol}</span>
                  </div>
                </TableCell>
                <TableCell 
                  className="text-right font-mono text-sm"
                  style={{ padding: '1.5rem 2rem' }}
                >
                  <span className="text-muted-foreground">
                    {asset.amount.toLocaleString('en-US', { 
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 8 
                    })}
                  </span>
                </TableCell>
                <TableCell 
                  className="text-right font-mono text-sm"
                  style={{ padding: '1.5rem 2rem' }}
                >
                  <span className="text-muted-foreground">
                    ${asset.price ? asset.price.toLocaleString('en-US', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 8 
                    }) : '0.00'}
                  </span>
                </TableCell>
                <TableCell 
                  className="text-right"
                  style={{ padding: '1.5rem 2rem' }}
                >
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-bold text-base font-mono">
                      ${asset.valueUsd.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                    {asset.valueUsd > 0 && (
                      <TrendingUp className="h-4 w-4 text-primary/70" />
                    )}
                  </div>
                </TableCell>
                <TableCell style={{ padding: '1.5rem 2rem' }}>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/70 text-muted-foreground border border-border/50">
                    {asset.source}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {assets.length === 0 && (
              <TableRow>
                <TableCell 
                  colSpan={5} 
                  className="text-center"
                  style={{ padding: '5rem 2rem' }}
                >
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center shadow-lg">
                        <ExternalLink className="h-10 w-10 opacity-40" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary/20 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">暂无资产数据</p>
                      <p className="text-sm opacity-70">请在设置中添加 API Key 或钱包地址</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

