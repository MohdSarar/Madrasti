'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function titleize(segment: string) {
  return decodeURIComponent(segment)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:underline">Accueil</Link>
        </li>
        {segments.map((seg, i) => {
          const href = '/' + segments.slice(0, i + 1).join('/');
          const isLast = i === segments.length - 1;
          return (
            <li key={href} className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              {isLast ? (
                <span className="text-slate-900">{titleize(seg)}</span>
              ) : (
                <Link href={href} className="hover:underline">
                  {titleize(seg)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
