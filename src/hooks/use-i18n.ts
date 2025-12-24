"use client"

import { useAssetStore } from '@/components/providers/asset-provider';
import { getTranslation, Language } from '@/lib/i18n';

export function useI18n() {
  const { settings } = useAssetStore();
  const language = settings.language || 'zh';

  const t = (key: string, params?: Record<string, string | number>): string => {
    return getTranslation(language, key, params);
  };

  return { t, language };
}

