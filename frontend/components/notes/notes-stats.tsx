'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { GradesSummary } from '@/lib/types/grades';

function Stat({ title, value, helper }: { title: string; value: string; helper?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
      </CardContent>
    </Card>
  );
}

export function NotesStats({ data, isLoading }: { data?: GradesSummary; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const avg = data?.average != null ? data.average.toFixed(2) : '—';
  const rank = data?.rank != null ? `#${data.rank}` : '—';
  const total = data?.total != null ? String(data.total) : '—';
  const prog = data?.progress != null ? `${data.progress > 0 ? '+' : ''}${data.progress.toFixed(1)}%` : '—';

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Stat title="Moyenne générale" value={avg} helper="Sur 20" />
      <Stat title="Classement" value={rank} helper="Dans la classe" />
      <Stat title="Notes saisies" value={total} helper="Ce trimestre" />
      <Stat title="Progression" value={prog} helper="Vs. période précédente" />
    </div>
  );
}
