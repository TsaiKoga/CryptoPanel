"use client"

import { useAssetStore } from '@/components/providers/asset-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, AlertCircle, Languages } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { Language } from '@/types';

export function GeneralSettings() {
  const { settings, updateSettings } = useAssetStore();
  const { t } = useI18n();

  return (
    <Card className="border-2 border-border/50 shadow-xl">
      <CardHeader className="space-y-3 pb-6" style={{ padding: '2rem 2rem 1.5rem 2rem' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{t('settings.title')}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {t('settings.subtitle')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8" style={{ padding: '0 2rem 2rem 2rem' }}>
        {/* Language Selection */}
        <div className="flex items-start justify-between gap-6 p-6 rounded-xl bg-muted/30 border border-border/50">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              <Label className="text-base font-semibold">{t('settings.language')}</Label>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t('settings.languageDesc')}</p>
            </div>
          </div>
          <div className="flex-shrink-0 pt-1">
            <Select 
              value={settings.language || 'zh'} 
              onValueChange={(value: Language) => updateSettings({ language: value })}
            >
              <SelectTrigger className="h-12 w-32 rounded-xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Hide Small Assets */}
        <div className="flex items-start justify-between gap-6 p-6 rounded-xl bg-muted/30 border border-border/50">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold">{t('settings.hideSmallAssets')}</Label>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t('settings.hideSmallAssetsDesc')}</p>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('settings.hideSmallAssetsWarning')}
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
            <Label className="text-sm font-semibold">{t('settings.smallAssetsThreshold')}</Label>
            <Input 
              type="number" 
              value={settings.smallAssetsThreshold}
              onChange={(e) => updateSettings({ smallAssetsThreshold: parseFloat(e.target.value) || 0 })}
              className="h-12 rounded-xl border-2"
              placeholder={t('settings.smallAssetsThresholdPlaceholder')}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

