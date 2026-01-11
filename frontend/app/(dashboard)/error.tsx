'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Erreur</h2>
      <p className="text-sm text-slate-600">{error.message}</p>
      <Button onClick={() => reset()}>Réessayer</Button>
    </div>
  );
}

