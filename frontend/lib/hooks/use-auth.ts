'use client';

import { useAuthStore } from '@/lib/stores/auth-store';

export function useAuth() {
  const { user, isLoading, error, login, logout } = useAuthStore();
  return { user, isLoading, error, login, logout };
}

