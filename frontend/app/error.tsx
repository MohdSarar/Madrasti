'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
        <p className="mt-2 text-sm text-slate-600">
          Nous n&apos;avons pas pu charger cette page. Vous pouvez réessayer.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => reset()}>Réessayer</Button>
          <Button variant="secondary" onClick={() => (window.location.href = '/')}>
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
