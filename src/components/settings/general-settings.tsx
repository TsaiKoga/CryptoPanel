"use client"

import { useAssetStore } from '@/components/providers/asset-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function GeneralSettings() {
  const { settings, updateSettings } = useAssetStore();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>通用设置</CardTitle>
        <CardDescription>配置显示偏好</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>隐藏小额资产</Label>
            <div className="text-sm text-muted-foreground">
              <p>隐藏价值低于阈值的资产</p>
              <p className="text-xs text-amber-600 mt-1">注意: 未获取到价格的代币(如新 MEME) 将显示为 $0，会被此选项隐藏。</p>
            </div>
          </div>
          <Switch 
            checked={settings.hideSmallAssets}
            onCheckedChange={(checked) => updateSettings({ hideSmallAssets: checked })}
          />
        </div>
        
        {settings.hideSmallAssets && (
          <div className="space-y-2">
            <Label>小额资产阈值 (USD)</Label>
            <Input 
              type="number" 
              value={settings.smallAssetsThreshold}
              onChange={(e) => updateSettings({ smallAssetsThreshold: parseFloat(e.target.value) || 0 })}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

