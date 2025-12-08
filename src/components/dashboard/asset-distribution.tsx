"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Asset } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function AssetDistribution({ assets }: { assets: Asset[] }) {
  const dataMap = assets.reduce((acc, asset) => {
    const key = asset.symbol;
    if (!acc[key]) acc[key] = 0;
    acc[key] += asset.valueUsd;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(dataMap)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const totalTop = data.reduce((sum, item) => sum + item.value, 0);
  const totalAll = Object.values(dataMap).reduce((sum, v) => sum + v, 0);
  if (totalAll > totalTop) {
      data.push({ name: 'Others', value: totalAll - totalTop });
  }

  if (totalAll === 0) {
      return (
        <Card className="col-span-1">
            <CardHeader><CardTitle>资产分布</CardTitle></CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                暂无数据
            </CardContent>
        </Card>
      );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>资产分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

