'use client';

import * as React from 'react';
import { Menu, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/hooks/use-auth';

export function Header({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="md:hidden" onClick={onOpenMobileNav} aria-label="Ouvrir le menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden md:block text-sm text-slate-500">Tableau de bord</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-sm font-medium text-slate-900">{user?.full_name ?? user?.email ?? 'Utilisateur'}</span>
          <span className="text-xs text-slate-500">{user?.role ?? 'Compte'}</span>
        </div>
        <Avatar>
          <AvatarFallback>{(user?.email ?? 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Button variant="outline" size="icon" onClick={logout} aria-label="Déconnexion">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
