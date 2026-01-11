'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NotesTable } from '@/components/notes/notes-table';
import { useSubjects, useGradesByStudent } from '@/lib/hooks/use-grades';

function StatCard({ title, value, hint }: { title: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function pct(m: number, t: number) {
  return t > 0 ? (m / t) * 100 : 0;
}

function downloadCsv(rows: Array<Record<string, any>>, filename: string) {
  const headers = Object.keys(rows[0] ?? {});
  const escape = (v: any) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const content = [headers.join(','), ...rows.map((r: any) => headers.map((h: any) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function NotesPage() {
  // MVP assumption: current user = studentId "test" (align with your verify script). Replace with real profile later.
  const [studentId] = React.useState('test');
  const [periodId, setPeriodId] = React.useState<string>('');
  const [subjectId, setSubjectId] = React.useState<string>('all');

  const subjects = useSubjects();
  const gradesQuery = useGradesByStudent({ studentId, periodId: periodId.trim() ? periodId.trim() : undefined });

  const grades = gradesQuery.data ?? [];
  const subjectMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subjects.data ?? []) m.set(s.id, s.name);
    return m;
  }, [subjects.data]);

  const view = React.useMemo(() => {
    const filtered = subjectId === 'all' ? grades : grades.filter((g: any) => g.subject_id === subjectId);
    const normalized = filtered.map((g: any) => ({
      id: g.id,
      subject_name: g.subject_id ? subjectMap.get(g.subject_id) ?? g.subject_id : '—',
      evaluation_name: g.assessment_id,
      marks_obtained: Number(g.marks_obtained ?? 0),
      marks_total: Number(g.marks_total ?? 0),
      date: g.created_at ? format(new Date(g.created_at), 'yyyy-MM-dd') : null
    }));
    return normalized;
  }, [grades, subjectId, subjectMap]);

  const stats = React.useMemo(() => {
    const total = view.length;
    if (total === 0) return { total: 0, average: null as number | null, best: null as number | null };
    const pcts = view.map((g: any) => pct(g.marks_obtained, g.marks_total));
    const average = pcts.reduce((a: any, b: any) => a + b, 0) / pcts.length;
    const best = Math.max(...pcts);
    return { total, average, best };
  }, [view]);

  const chartData = React.useMemo(() => {
    return view
      .slice(0, 10)
      .map((g: any) => ({ name: g.subject_name, pct: Math.round(pct(g.marks_obtained, g.marks_total)) }))
      .reverse();
  }, [view]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notes</h1>
          <p className="text-sm text-slate-500">Données réelles via Academic Service.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="w-[220px]">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Matière" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les matières</SelectItem>
                {(subjects.data ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            className="w-[220px]"
            placeholder="Période (periodId)"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          />

          <Button
            variant="secondary"
            onClick={() => {
              downloadCsv(
                view.map((g: any) => ({
                  subject: g.subject_name,
                  assessment: g.evaluation_name,
                  obtained: g.marks_obtained,
                  total: g.marks_total,
                  percent: Math.round(pct(g.marks_obtained, g.marks_total)),
                  date: g.date ?? ''
                })),
                `madrasti-notes-${studentId}.csv`
              );
            }}
            disabled={view.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Nombre de notes" value={gradesQuery.isLoading ? <Skeleton className="h-8 w-20" /> : stats.total} />
        <StatCard
          title="Moyenne"
          value={gradesQuery.isLoading ? <Skeleton className="h-8 w-24" /> : stats.average ? `${stats.average.toFixed(1)}%` : '—'}
          hint={periodId.trim() ? `Période: ${periodId.trim()}` : 'Toutes périodes'}
        />
        <StatCard
          title="Meilleure note"
          value={gradesQuery.isLoading ? <Skeleton className="h-8 w-24" /> : stats.best ? `${stats.best.toFixed(0)}%` : '—'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          {gradesQuery.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : view.length === 0 ? (
            <div className="text-sm text-slate-500">Aucune note.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="pct" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <NotesTable data={view} isLoading={gradesQuery.isLoading} />
    </div>
  );
}
