import { create } from 'zustand';
import { authClient } from '@/lib/api/client';
import type { LoginInput, LoginResponse, User } from '@/lib/types/auth';

type AuthState = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function setCookie(name: string, value: string, opts?: { maxAgeSeconds?: number }) {
  if (!isBrowser()) return;
  const safe = encodeURIComponent(value);
  const maxAge = opts?.maxAgeSeconds ? `; Max-Age=${opts.maxAgeSeconds}` : '';
  // MVP cookie is not HttpOnly (cannot be set from client). Production target: HttpOnly Secure via BFF/auth gateway.
  document.cookie = `${name}=${safe}; Path=/; SameSite=Lax${maxAge}`;
}

function clearCookie(name: string) {
  if (!isBrowser()) return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function setTokens(data: LoginResponse) {
  // Session cookies (no localStorage)
  // Access token typically short-lived; refresh longer.
  setCookie('madrasti_at', data.access_token);
  setCookie('madrasti_rt', data.refresh_token, { maxAgeSeconds: 60 * 60 * 24 * 14 }); // 14 days
}

function clearTokens() {
  clearCookie('madrasti_at');
  clearCookie('madrasti_rt');
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  hydrate: () => {
    // If tokens exist but we don't have user payload, keep user null until we implement /me on BFF.
    const at = getCookie('madrasti_at');
    const rt = getCookie('madrasti_rt');
    if (!at || !rt) {
      set({ user: null });
    }
  },

  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authClient.post<LoginResponse>('/v1/auth/login', input);
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error('Invalid login response');
      }
      setTokens(data);
      set({ user: data.user ?? { id: 'me', email: input.email }, isLoading: false });
    } catch (e: unknown) {
      const err = e as any;
      const message = err?.response?.data?.message || err?.message || 'Login failed';
      set({ error: String(message), isLoading: false, user: null });
      clearTokens();
    }
  },

  logout: async () => {
    try {
      // best-effort
      await authClient.post('/v1/auth/logout', {});
    } catch {
      // ignore
    } finally {
      clearTokens();
      set({ user: null, error: null, isLoading: false });
    }
  }
}));

