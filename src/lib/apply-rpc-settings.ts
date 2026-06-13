import { AppSettings } from '@/types';
import { setCustomRpcUrls } from '@/lib/rpc';
import { setCustomSolanaRpcUrl } from '@/lib/solana-core';

export function getRpcSettingsFingerprint(settings: AppSettings): string {
  const evm: Record<string, string> = {};
  if (settings.customRpcUrls) {
    for (const [id, url] of Object.entries(settings.customRpcUrls)) {
      const trimmed = url?.trim();
      if (trimmed) evm[id] = trimmed;
    }
  }
  return JSON.stringify({
    solana: settings.customSolanaRpcUrl?.trim() ?? '',
    evm,
  });
}

export function applyRpcSettings(settings: AppSettings): void {
  const overrides: Record<number, string> = {};

  if (settings.customRpcUrls) {
    for (const [id, url] of Object.entries(settings.customRpcUrls)) {
      const trimmed = url?.trim();
      if (trimmed) overrides[Number(id)] = trimmed;
    }
  }

  setCustomRpcUrls(overrides);
  setCustomSolanaRpcUrl(settings.customSolanaRpcUrl);
}
