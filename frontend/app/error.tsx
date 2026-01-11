'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body className="p-6">
        <div className="mx-auto max-w-lg space-y-3">
          <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
          <p className="text-sm text-slate-600">{error.message}</p>
          <Button onClick={() => reset()}>Réessayer</Button>
        </div>
      </body>
    </html>
  );
}
