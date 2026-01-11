'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function AuthError({ error, reset }: { error: Error; reset: () => void }) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Erreur d&apos;authentification</h2>
        <p className="mt-2 text-sm text-slate-600">Veuillez réessayer.</p>
        <div className="mt-4">
          <Button onClick={() => reset()}>Réessayer</Button>
        </div>
      </div>
    </div>
  );
}
