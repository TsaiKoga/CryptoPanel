"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Asset } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';

// 更美观的颜色方案
const COLORS = [
  'oklch(0.488 0.243 264.376)', // 蓝色
  'oklch(0.696 0.17 162.48)',   // 绿色
  'oklch(0.769 0.188 70.08)',   // 黄色
  'oklch(0.627 0.265 303.9)',   // 紫色
  'oklch(0.645 0.246 16.439)',  // 橙色
  'oklch(0.556 0 0)',            // 灰色
];

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
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative pt-6 pb-4 px-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <PieChartIcon className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>资产分布</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative h-[300px] flex items-center justify-center text-muted-foreground px-6 pb-6">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <PieChartIcon className="h-8 w-8 opacity-30" />
              </div>
              <p className="text-sm">暂无数据</p>
            </div>
          </CardContent>
        </Card>
      );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalAll) * 100).toFixed(1);
      return (
        <div className="bg-card border-2 border-border rounded-xl shadow-xl backdrop-blur-sm">
          <div className="px-5 py-4 space-y-2">
            <p className="font-semibold text-base leading-tight">{data.name}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ${data.value.toFixed(2)} <span className="text-muted-foreground/70">({percentage}%)</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      <CardHeader className="relative pt-6 pb-4 px-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <PieChartIcon className="h-4 w-4 text-primary" />
          </div>
          <CardTitle>资产分布</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative px-6 pb-6">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    className="transition-all hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '1rem' }}
                formatter={(value) => {
                  const item = data.find(d => d.name === value);
                  if (item) {
                    const percentage = ((item.value / totalAll) * 100).toFixed(1);
                    return `${value} (${percentage}%)`;
                  }
                  return value;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

