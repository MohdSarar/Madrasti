'use client';

import * as React from 'react';
import { addDays, format, startOfWeek } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklySchedule } from '@/lib/hooks/use-schedule';

const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

function normalizeDow(raw: number) {
  // Normalize to 0..6 where Monday=0
  // Accepts:
  //  - 0..6 already
  //  - 1..7 where Mon=1..Sun=7
  if (raw >= 0 && raw <= 6) return raw;
  if (raw >= 1 && raw <= 7) return raw - 1;
  return 0;
}

function clampDow(raw: unknown): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const n = Number(raw);
  const norm = normalizeDow(Number.isFinite(n) ? n : 0);
  const clamped = Math.min(6, Math.max(0, norm));
  return clamped as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

type ScheduleEntry = {
  id?: string | number;
  day_of_week?: number | string | null;
  start_time?: string | null;
  end_time?: string | null;
  subject?: string | null;
  room?: string | null;
};

export default function SchedulePage() {
  const [entityType, setEntityType] = React.useState('student');
  const [entityId, setEntityId] = React.useState('test');

  const weekStart = React.useMemo(() => {
    const s = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(s, 'yyyy-MM-dd');
  }, []);

  const q = useWeeklySchedule(entityType, entityId, weekStart);

  const grouped = React.useMemo(() => {
    const buckets: [
      ScheduleEntry[],
      ScheduleEntry[],
      ScheduleEntry[],
      ScheduleEntry[],
      ScheduleEntry[],
      ScheduleEntry[],
      ScheduleEntry[],
    ] = [[], [], [], [], [], [], []];

    const entries = (q.data?.entries ?? []) as ScheduleEntry[];
    for (const e of entries) {
      const d = clampDow(e.day_of_week);
      buckets[d].push(e);
    }

    // IMPORTANT: don't do buckets[i] with i:number (TS can complain).
    for (const bucket of buckets) {
      bucket.sort((a, b) =>
        String(a.start_time ?? '').localeCompare(String(b.start_time ?? ''))
      );
    }

    return buckets;
  }, [q.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Emploi du temps</h1>
          <p className="text-sm text-slate-500">Vue hebdomadaire (Scheduling Service).</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            className="w-[160px]"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            placeholder="entityType"
          />
          <Input
            className="w-[220px]"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="entityId"
          />
          <Button variant="secondary" onClick={() => q.refetch()}>
            Recharger
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Semaine du {weekStart}</CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : q.isError ? (
            <div className="text-sm text-slate-500">Erreur lors du chargement.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
                const entries = grouped[i] ?? [];

                return (
                  <div key={i} className="rounded-xl border border-slate-200 p-3">
                    <div className="font-medium">{dayLabels[i]}</div>
                    <div className="text-xs text-slate-500">{format(day, 'dd/MM')}</div>

                    <div className="mt-3 space-y-2">
                      {entries.length === 0 ? (
                        <div className="text-xs text-slate-400">—</div>
                      ) : (
                        entries.map((e, idx) => (
                          <div key={String(e.id ?? idx)} className="rounded-lg bg-slate-50 p-2">
                            <div className="text-sm font-medium">{e.subject ?? 'Cours'}</div>
                            <div className="text-xs text-slate-500">
                              {e.start_time ?? '?'} → {e.end_time ?? '?'}
                              {e.room ? ` · ${e.room}` : ''}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

