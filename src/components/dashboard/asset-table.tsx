import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Asset } from '@/types';

export function AssetTable({ assets }: { assets: Asset[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>币种</TableHead>
            <TableHead>数量</TableHead>
            <TableHead>单价 (USD)</TableHead>
            <TableHead>总值 (USD)</TableHead>
            <TableHead>来源</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{asset.symbol}</TableCell>
              <TableCell>
                {asset.amount.toLocaleString('en-US', { 
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 8 
                })}
              </TableCell>
              <TableCell>
                ${asset.price ? asset.price.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 8 
                }) : '0'}
              </TableCell>
              <TableCell>${asset.valueUsd.toLocaleString()}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{asset.source}</TableCell>
            </TableRow>
          ))}
          {assets.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                暂无资产数据，请在设置中添加 API Key 或钱包地址
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

