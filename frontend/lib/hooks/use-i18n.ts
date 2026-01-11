'use client';

import { useUiStore } from '@/lib/stores/ui-store';
import { t } from '@/lib/i18n';

export function useI18n() {
  const lang = useUiStore((s) => s.lang);
  return {
    lang,
    t: (key: Parameters<typeof t>[1]) => t(lang, key)
  };
}

