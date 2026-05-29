import { create } from 'zustand';
import { authClient } from '@/lib/api/client';

type LoginInput = { email: string; password: string };

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user?: {
    id: string;
    email: string;
    role: string;
    full_name?: string;
  };
};

type AuthState = {
  user: LoginResponse['user'] | null;
  isLoading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hydrate: () => void;
  refreshToken: () => Promise<boolean>;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const pattern = `(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`;
  const m = document.cookie.match(new RegExp(pattern));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function setTokens(data: LoginResponse) {
  if (!isBrowser()) return;

  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  const exp = expires.toUTCString();

  document.cookie = `madrasti_at=${data.access_token}; path=/; expires=${exp}; SameSite=Lax`;
  if (data.refresh_token) {
    document.cookie = `refresh_token=${data.refresh_token}; path=/; expires=${exp}; SameSite=Lax`;
  }
}

function clearTokens() {
  if (!isBrowser()) return;
  document.cookie = 'madrasti_at=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
}

let refreshPromise: Promise<boolean> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (input: LoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authClient.post<LoginResponse>('/v1/auth/login', input);
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error('Invalid login response');
      }
      setTokens(data);
      set({ user: data.user ?? null, isLoading: false });
    } catch (err: any) {
      const msg = err?.message || 'Login failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authClient.post('/v1/auth/logout', {});
    } catch {
      // ignore logout errors
    } finally {
      clearTokens();
      set({ user: null, error: null });
    }
  },

  checkAuth: async () => {
    const accessToken = getCookie('madrasti_at');
    if (!accessToken) {
      set({ user: null });
      return;
    }

    try {
      const data = await authClient.get<LoginResponse['user']>('/v1/auth/me');
      set({ user: data ?? null });
    } catch (error: any) {
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        const refreshed = await get().refreshToken();
        if (refreshed) {
          try {
            const data = await authClient.get<LoginResponse['user']>('/v1/auth/me');
            set({ user: data ?? null });
            return;
          } catch {
            // still failing after refresh — clear session
          }
        }
      }
      clearTokens();
      set({ user: null });
    }
  },

  refreshToken: async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const refreshToken = getCookie('refresh_token');
        if (!refreshToken) {
          return false;
        }

        const data = await authClient.post<LoginResponse>('/v1/auth/refresh', {
          refresh_token: refreshToken
        });

        if (!data?.access_token) {
          throw new Error('Invalid refresh response');
        }

        setTokens(data);
        set({ user: data.user ?? get().user });
        return true;
      } catch (error) {
        console.error('[AuthStore] Refresh token failed:', error);
        clearTokens();
        set({ user: null });
        return false;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  hydrate: () => {
    const accessToken = getCookie('madrasti_at');
    if (accessToken) {
      get().checkAuth().catch(() => {
        clearTokens();
        set({ user: null });
      });
    } else {
      set({ user: null });
    }
  }
}));

if (isBrowser()) {
  setInterval(async () => {
    const accessToken = getCookie('madrasti_at');
    if (accessToken) {
      const store = useAuthStore.getState();
      await store.refreshToken();
    }
  }, 10 * 60 * 1000);
}
