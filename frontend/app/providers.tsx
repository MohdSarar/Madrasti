'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useUiStore } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';

function Boot() {
  const hydrateUi = useUiStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  React.useEffect(() => {
    hydrateUi();
    hydrateAuth();
  }, [hydrateUi, hydrateAuth]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Boot />
      {children}
      <Toaster richColors />
    </QueryClientProvider>
  );
}
