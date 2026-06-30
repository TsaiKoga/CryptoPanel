"use client"

import { useAssetStore } from '@/components/providers/asset-provider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, AlertCircle, Languages, Gauge } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { Language } from '@/types';
import { RpcSettings } from '@/components/settings/rpc-settings';
import { normalizeFearGreedAlertSettings } from '@/lib/fear-greed-alerts';
import { isChromeExtension } from '@/lib/storage';
import {
  FieldLabel,
  SettingsPanel,
  SettingsSection,
} from '@/components/settings/settings-section';

export function GeneralSettings() {
  const { settings, updateSettings } = useAssetStore();
  const { t } = useI18n();
  const fearGreedAlerts = normalizeFearGreedAlertSettings(settings.fearGreedAlerts);

  const patchFearGreedAlerts = (patch: Partial<typeof fearGreedAlerts>) => {
    updateSettings({
      fearGreedAlerts: normalizeFearGreedAlertSettings({
        ...fearGreedAlerts,
        ...patch,
      }),
    });
  };

  const parseThresholdInput = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return null;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  return (
    <SettingsPanel
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      icon={SettingsIcon}
    >
      <SettingsSection className="flex flex-row items-start justify-between gap-6 space-y-0">
        <FieldLabel
          icon={Languages}
          label={t('settings.language')}
          description={t('settings.languageDesc')}
        />
        <div className="pt-1 shrink-0">
          <Select
            value={settings.language || 'en'}
            onValueChange={(value: Language) => updateSettings({ language: value })}
          >
            <SelectTrigger className="h-11 w-32 rounded-xl border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>

      <SettingsSection className="flex flex-row items-start justify-between gap-6 space-y-0">
        <div className="space-y-3 flex-1 min-w-0">
          <Label className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            {t('settings.hideSmallAssets')}
          </Label>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
            {t('settings.hideSmallAssetsDesc')}
          </p>
          <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {t('settings.hideSmallAssetsWarning')}
            </p>
          </div>
        </div>
        <div className="pt-1 shrink-0">
          <Switch
            checked={settings.hideSmallAssets}
            onCheckedChange={(checked) => updateSettings({ hideSmallAssets: checked })}
          />
        </div>
      </SettingsSection>

      {settings.hideSmallAssets && (
        <SettingsSection>
          <Label className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {t('settings.smallAssetsThreshold')}
          </Label>
          <Input
            type="number"
            value={settings.smallAssetsThreshold}
            onChange={(e) =>
              updateSettings({ smallAssetsThreshold: parseFloat(e.target.value) || 0 })
            }
            className="h-11 rounded-xl border-2"
            placeholder={t('settings.smallAssetsThresholdPlaceholder')}
          />
        </SettingsSection>
      )}

      <SettingsSection className="flex flex-row items-start justify-between gap-6 space-y-0">
        <div className="space-y-3 flex-1 min-w-0">
          <FieldLabel
            icon={Gauge}
            label={t('settings.fearGreedAlertTitle')}
            description={t('settings.fearGreedAlertDesc')}
          />
          {!isChromeExtension && (
            <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50 border border-border/50">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('settings.fearGreedAlertExtensionOnly')}
              </p>
            </div>
          )}
        </div>
        <div className="pt-1 shrink-0">
          <Switch
            checked={fearGreedAlerts.enabled}
            disabled={!isChromeExtension}
            onCheckedChange={(checked) => patchFearGreedAlerts({ enabled: checked })}
          />
        </div>
      </SettingsSection>

      {fearGreedAlerts.enabled && isChromeExtension && (
        <SettingsSection className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {t('settings.fearGreedAlertBelow')}
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={fearGreedAlerts.alertBelow ?? ''}
              onChange={(e) =>
                patchFearGreedAlerts({ alertBelow: parseThresholdInput(e.target.value) })
              }
              className="h-11 rounded-xl border-2"
              placeholder={t('settings.fearGreedAlertBelowPlaceholder')}
            />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              {t('settings.fearGreedAlertBelowHint')}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {t('settings.fearGreedAlertAbove')}
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={fearGreedAlerts.alertAbove ?? ''}
              onChange={(e) =>
                patchFearGreedAlerts({ alertAbove: parseThresholdInput(e.target.value) })
              }
              className="h-11 rounded-xl border-2"
              placeholder={t('settings.fearGreedAlertAbovePlaceholder')}
            />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              {t('settings.fearGreedAlertAboveHint')}
            </p>
          </div>
          <p
            className="text-xs leading-relaxed pt-1 border-t border-border/50"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {t('settings.fearGreedAlertInterval')}
          </p>
        </SettingsSection>
      )}

      <RpcSettings />
    </SettingsPanel>
  );
}
