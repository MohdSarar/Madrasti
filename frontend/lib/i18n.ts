import type { Lang } from '@/lib/stores/ui-store';

type Dict = Record<string, string>;

const fr: Dict = {
  dashboard: 'Accueil',
  notes: 'Notes',
  attendance: 'Absences',
  schedule: 'Emploi du temps',
  messaging: 'Messagerie',
  documents: 'Documents',
  settings: 'Paramètres',
  loading: 'Chargement…',
  error_generic: 'Une erreur est survenue.',
  retry: 'Réessayer',
  dark_mode: 'Mode sombre',
  language: 'Langue'
};

const en: Dict = {
  dashboard: 'Dashboard',
  notes: 'Grades',
  attendance: 'Attendance',
  schedule: 'Schedule',
  messaging: 'Messaging',
  documents: 'Documents',
  settings: 'Settings',
  loading: 'Loading…',
  error_generic: 'Something went wrong.',
  retry: 'Retry',
  dark_mode: 'Dark mode',
  language: 'Language'
};

const ar: Dict = {
  dashboard: 'الرئيسية',
  notes: 'الدرجات',
  attendance: 'الغياب',
  schedule: 'الجدول',
  messaging: 'الرسائل',
  documents: 'الوثائق',
  settings: 'الإعدادات',
  loading: 'جارٍ التحميل…',
  error_generic: 'حدث خطأ.',
  retry: 'إعادة المحاولة',
  dark_mode: 'الوضع الداكن',
  language: 'اللغة'
};

export function t(lang: Lang, key: keyof typeof fr): string {
  const dict = lang === 'ar' ? ar : lang === 'en' ? en : fr;
  return dict[key] ?? fr[key] ?? String(key);
}
