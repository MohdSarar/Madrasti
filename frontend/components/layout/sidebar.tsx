'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { School } from 'lucide-react';

import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white md:block">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500">
          <School className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold">Madrasti</p>
          <p className="text-xs text-slate-500">Plateforme scolaire</p>
        </div>
      </div>

      <nav className="p-3" aria-label="Navigation principale">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    active ? 'bg-primary-50 text-primary-600' : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
