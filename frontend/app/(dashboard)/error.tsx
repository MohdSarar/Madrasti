'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Erreur du tableau de bord</h2>
        <p className="mt-2 text-sm text-slate-600">
          Un problème est survenu lors du chargement. Essayez à nouveau.
        </p>
        <div className="mt-4">
          <Button onClick={() => reset()}>Réessayer</Button>
        </div>
      </div>
    </div>
  );
}
