"use client"

import { useState, type ComponentType, type ReactNode } from 'react';
import { useAssetStore } from '@/components/providers/asset-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, AlertCircle, Shield, KeyRound } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { AiPrivacyMode, AiProvider, DEFAULT_AI_SETTINGS } from '@/types';
import { getProviderHostPermission, getAiEndpoint, getDefaultModelForProvider, normalizeAiSettings } from '@/lib/ai-analyze';
import { isChromeExtension } from '@/lib/storage';

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

async function ensureAiHostPermission(
  provider: AiProvider,
  baseUrl?: string
): Promise<boolean> {
  if (!isChromeExtension || !chrome.permissions) return true;

  const origin = getProviderHostPermission(provider, baseUrl);
  if (!origin) return false;

  const has = await chrome.permissions.contains({ origins: [origin] });
  if (has) return true;

  return chrome.permissions.request({ origins: [origin] });
}

function SettingsSection({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl bg-muted/30 border border-border/50 p-6 sm:p-7 space-y-5 ${className}`}
    >
      {children}
    </div>
  );
}

function FieldLabel({
  icon: Icon,
  label,
  description,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
        <Label className="text-base font-semibold leading-snug">{label}</Label>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      )}
    </div>
  );
}

export function AiSettingsPanel() {
  const { settings, updateSettings } = useAssetStore();
  const { t } = useI18n();
  const ai = { ...DEFAULT_AI_SETTINGS, ...settings.ai };
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const patchAi = (patch: Partial<typeof ai>) => {
    updateSettings({ ai: normalizeAiSettings({ ...ai, ...patch }) });
  };

  const handleEnableChange = async (enabled: boolean) => {
    setPermissionError(null);
    if (enabled && isChromeExtension) {
      const granted = await ensureAiHostPermission(ai.provider, ai.baseUrl);
      if (!granted) {
        setPermissionError(t('aiSettings.permissionDenied'));
        return;
      }
    }
    patchAi({ enabled });
  };

  const handleProviderChange = async (provider: AiProvider) => {
    setPermissionError(null);
    patchAi({
      provider,
      model: getDefaultModelForProvider(provider),
      baseUrl: provider === 'custom' ? ai.baseUrl : undefined,
    });
    if (ai.enabled && isChromeExtension) {
      const granted = await ensureAiHostPermission(
        provider,
        provider === 'custom' ? ai.baseUrl : undefined
      );
      if (!granted) setPermissionError(t('aiSettings.permissionDenied'));
    }
  };

  const { url: activeEndpoint } = getAiEndpoint(normalizeAiSettings(ai));

  return (
    <Card className="border-2 border-border/50 shadow-xl gap-0 py-0">
      <CardHeader className="px-6 sm:px-8 pt-8 pb-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-2xl font-bold">{t('aiSettings.title')}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t('aiSettings.subtitle')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 sm:px-8 pt-0 pb-8 flex flex-col gap-6">
        <div className="flex items-start gap-3 p-5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
            {t('aiSettings.disclaimer')}
          </p>
        </div>

        <SettingsSection className="flex flex-row items-start justify-between gap-6 space-y-0">
          <div className="space-y-2 flex-1 min-w-0">
            <Label className="text-base font-semibold">{t('aiSettings.enable')}</Label>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('aiSettings.enableDesc')}</p>
          </div>
          <div className="pt-1 shrink-0">
            <Switch checked={ai.enabled} onCheckedChange={handleEnableChange} />
          </div>
        </SettingsSection>

        {permissionError && (
          <p className="text-sm text-destructive leading-relaxed px-1">{permissionError}</p>
        )}

        {ai.enabled && (
          <div className="flex flex-col gap-6">
            <SettingsSection>
              <FieldLabel label={t('aiSettings.provider')} />
              <Select value={ai.provider} onValueChange={(v: AiProvider) => handleProviderChange(v)}>
                <SelectTrigger className="h-11 w-full rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="custom">{t('aiSettings.providerCustom')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                {t('aiSettings.endpointHint', { url: activeEndpoint })}
              </p>
            </SettingsSection>

            <SettingsSection>
              <FieldLabel
                icon={KeyRound}
                label={t('aiSettings.apiKey')}
                description={t('aiSettings.apiKeyDesc')}
              />
              <Input
                type="password"
                value={ai.apiKey}
                onChange={(e) => patchAi({ apiKey: e.target.value })}
                className="h-11 rounded-xl border-2"
                placeholder={t('aiSettings.apiKeyPlaceholder')}
              />
              {ai.apiKey && (
                <p className="text-xs text-muted-foreground pt-1">
                  {t('aiSettings.apiKeyMasked')}: {maskApiKey(ai.apiKey)}
                </p>
              )}
            </SettingsSection>

            {ai.provider === 'custom' && (
              <SettingsSection>
                <FieldLabel
                  label={t('aiSettings.baseUrl')}
                  description={t('aiSettings.baseUrlDesc')}
                />
                <Input
                  value={ai.baseUrl || ''}
                  onChange={(e) => patchAi({ baseUrl: e.target.value })}
                  className="h-11 rounded-xl border-2"
                  placeholder={
                    ai.provider === 'custom'
                      ? 'http://127.0.0.1:11434/v1/chat/completions'
                      : ''
                  }
                />
              </SettingsSection>
            )}

            <SettingsSection>
              <FieldLabel label={t('aiSettings.model')} />
              <Input
                value={ai.model || ''}
                onChange={(e) => patchAi({ model: e.target.value })}
                className="h-11 rounded-xl border-2"
                placeholder={
                  ai.provider === 'deepseek'
                    ? 'deepseek-chat'
                    : ai.provider === 'custom'
                      ? 'llama3'
                      : 'gpt-4o-mini'
                }
              />
            </SettingsSection>

            <SettingsSection>
              <FieldLabel
                icon={Shield}
                label={t('aiSettings.privacyMode')}
                description={t('aiSettings.privacyModeDesc')}
              />
              <Select
                value={ai.privacyMode}
                onValueChange={(v: AiPrivacyMode) => patchAi({ privacyMode: v })}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent_only">{t('aiSettings.privacyPercentOnly')}</SelectItem>
                  <SelectItem value="include_amounts">{t('aiSettings.privacyIncludeAmounts')}</SelectItem>
                </SelectContent>
              </Select>
            </SettingsSection>

            {!isChromeExtension && (
              <div className="flex items-start gap-3 p-5 rounded-xl bg-muted/50 border border-border/50">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">{t('aiSettings.webHint')}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
