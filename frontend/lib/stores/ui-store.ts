import { create } from 'zustand';

export type Lang = 'fr' | 'en' | 'ar';

type UiState = {
  theme: 'light' | 'dark';
  lang: Lang;
  setTheme: (t: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
  hydrate: () => void;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string) {
  if (!isBrowser()) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
}

function applyTheme(theme: 'light' | 'dark') {
  if (!isBrowser()) return;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: 'light',
  lang: 'fr',

  hydrate: () => {
    const theme = (getCookie('madrasti_theme') as any) === 'dark' ? 'dark' : 'light';
    const lang = (getCookie('madrasti_lang') as any) as Lang | undefined;
    const safeLang: Lang = lang === 'en' || lang === 'ar' || lang === 'fr' ? lang : 'fr';
    set({ theme, lang: safeLang });
    applyTheme(theme);
    if (safeLang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = safeLang;
    }
  },

  setTheme: (t) => {
    setCookie('madrasti_theme', t);
    applyTheme(t);
    set({ theme: t });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setLang: (l) => {
    setCookie('madrasti_lang', l);
    if (isBrowser()) {
      document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = l;
    }
    set({ lang: l });
  }
}));
