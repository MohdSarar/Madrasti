'use client';

import * as React from 'react';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useSocket } from '@/lib/hooks/use-socket';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  useSocket();

  React.useEffect(() => {
    // Basic client-side guard (localStorage-based). Replace with HttpOnly cookie auth in BFF for production.
    const token = window.localStorage.getItem('access_token');
    if (!token) window.location.href = '/login';
  }, []);

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white border border-slate-200 px-3 py-2 rounded-md shadow"
      >
        Aller au contenu
      </a>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative h-full w-72 bg-white shadow-xl">
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="md:pl-64">
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />

        <main id="main" className="p-4 md:p-6">
          <Breadcrumb />
          <div className="mt-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
