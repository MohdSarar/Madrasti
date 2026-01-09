import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import type { LoginInput, LoginResponse, User } from '@/lib/types/auth';

type AuthState = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function setTokens(data: LoginResponse) {
  if (!isBrowser()) return;
  window.localStorage.setItem('access_token', data.access_token);
  window.localStorage.setItem('refresh_token', data.refresh_token);
}

function clearTokens() {
  if (!isBrowser()) return;
  window.localStorage.removeItem('access_token');
  window.localStorage.removeItem('refresh_token');
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  hydrate: () => {
    // If you later store user in localStorage or fetch /me, do it here.
    // For now, we keep user null until first successful login.
    void 0;
  },

  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post<LoginResponse>('/v1/auth/login', input);
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error('Invalid login response');
      }
      setTokens(data);
      set({ user: data.user ?? { id: 'me', email: input.email }, isLoading: false });
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || 'Login failed';
      set({ error: String(message), isLoading: false, user: null });
      clearTokens();
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null, error: null, isLoading: false });
  }
}));

