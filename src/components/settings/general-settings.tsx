"use client"

import { useAssetStore } from '@/components/providers/asset-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings as SettingsIcon, AlertCircle } from 'lucide-react';

export function GeneralSettings() {
  const { settings, updateSettings } = useAssetStore();

  return (
    <Card className="border-2 border-border/50 shadow-xl">
      <CardHeader className="space-y-3 pb-6" style={{ padding: '2rem 2rem 1.5rem 2rem' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">通用设置</CardTitle>
            <CardDescription className="mt-1 text-sm">
              配置显示偏好
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8" style={{ padding: '0 2rem 2rem 2rem' }}>
        <div className="flex items-start justify-between gap-6 p-6 rounded-xl bg-muted/30 border border-border/50">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold">隐藏小额资产</Label>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>隐藏价值低于阈值的资产</p>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  注意: 未获取到价格的代币(如新 MEME) 将显示为 $0，会被此选项隐藏。
                </p>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 pt-1">
            <Switch 
              checked={settings.hideSmallAssets}
              onCheckedChange={(checked) => updateSettings({ hideSmallAssets: checked })}
            />
          </div>
        </div>
        
        {settings.hideSmallAssets && (
          <div className="space-y-3 p-6 rounded-xl bg-muted/30 border border-border/50">
            <Label className="text-sm font-semibold">小额资产阈值 (USD)</Label>
            <Input 
              type="number" 
              value={settings.smallAssetsThreshold}
              onChange={(e) => updateSettings({ smallAssetsThreshold: parseFloat(e.target.value) || 0 })}
              className="h-12 rounded-xl border-2"
              placeholder="例如: 1"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

