"use client"

import { useAssetStore } from '@/components/providers/asset-provider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Network, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';
import { RPC_CHAIN_LIST, getDefaultRpcUrl } from '@/lib/rpc';
import { getDefaultSolanaRpcUrl } from '@/lib/solana-core';

export function RpcSettings() {
  const { settings, updateSettings } = useAssetStore();
  const { t } = useI18n();

  const customRpcUrls = settings.customRpcUrls ?? {};

  const notifyRpcChanged = () => {
    toast.info(t('settings.rpcSavedHint'), { duration: 5000 });
  };

  const updateChainRpc = (chainId: number, url: string) => {
    const key = String(chainId);
    const next = { ...customRpcUrls };
    if (url.trim()) {
      next[key] = url;
    } else {
      delete next[key];
    }
    updateSettings({ customRpcUrls: next });
  };

  const commitRpcChange = () => {
    notifyRpcChanged();
  };

  const resetChainRpc = (chainId: number) => {
    const key = String(chainId);
    const next = { ...customRpcUrls };
    delete next[key];
    updateSettings({ customRpcUrls: next });
  };

  const resetAllRpc = () => {
    updateSettings({ customRpcUrls: {}, customSolanaRpcUrl: undefined });
    notifyRpcChanged();
  };

  const hasAnyCustom =
    Boolean(settings.customSolanaRpcUrl?.trim()) ||
    Object.values(customRpcUrls).some((url) => url?.trim());

  return (
    <div className="space-y-6 p-6 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <Label className="text-base font-semibold">{t('settings.rpcTitle')}</Label>
          </div>
          <p className="text-sm text-muted-foreground">{t('settings.rpcDesc')}</p>
        </div>
        {hasAnyCustom && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg"
            onClick={resetAllRpc}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            {t('settings.resetAllRpc')}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">{t('settings.solanaRpc')}</Label>
        <Input
          type="url"
          value={settings.customSolanaRpcUrl ?? ''}
          onChange={(e) =>
            updateSettings({
              customSolanaRpcUrl: e.target.value || undefined,
            })
          }
          onBlur={commitRpcChange}
          placeholder={getDefaultSolanaRpcUrl()}
          className="h-11 rounded-xl border-2 font-mono text-sm"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">{t('settings.evmRpc')}</Label>
        <div className="space-y-3">
          {RPC_CHAIN_LIST.map((chain) => {
            const value = customRpcUrls[String(chain.id)] ?? '';
            const defaultUrl = getDefaultRpcUrl(chain.id);
            return (
              <div key={chain.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-muted-foreground truncate" title={chain.name}>
                  {chain.name}
                </span>
                <Input
                  type="url"
                  value={value}
                  onChange={(e) => updateChainRpc(chain.id, e.target.value)}
                  onBlur={commitRpcChange}
                  placeholder={defaultUrl ?? t('settings.chainRpcPlaceholder')}
                  className="h-10 flex-1 rounded-xl border-2 font-mono text-xs"
                />
                {value.trim() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl"
                    title={t('settings.resetRpc')}
                    onClick={() => {
                      resetChainRpc(chain.id);
                      notifyRpcChanged();
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
