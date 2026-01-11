'use client';

import * as React from 'react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useGradesByStudent } from '@/lib/hooks/use-grades';
import { useAttendanceSummary } from '@/lib/hooks/use-attendance';
import { useWeeklySchedule } from '@/lib/hooks/use-schedule';
import { useInbox } from '@/lib/hooks/use-notifications';
import { useDocuments } from '@/lib/hooks/use-documents';

function pct(m: number, t: number) {
  return t > 0 ? (m / t) * 100 : 0;
}

function Widget({ title, value, hint, href }: { title: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (
    <Card className={href ? 'hover:shadow-sm transition-shadow' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block">
      {body}
    </Link>
  );
}

export default function DashboardHome() {
  // MVP: demo identifiers
  const studentId = 'test';
  const periodId = 'test';
  const entityType = 'student';
  const entityId = 'test';

  const grades = useGradesByStudent({ studentId });
  const attendance = useAttendanceSummary(studentId, periodId);
  const schedule = useWeeklySchedule(entityType, entityId);
  const inbox = useInbox();
  const documents = useDocuments();

  const avg = React.useMemo(() => {
    const rows = grades.data ?? [];
    if (rows.length === 0) return null;
    const pcts = rows.map((g: any) => pct(Number(g.marks_obtained ?? 0), Number(g.marks_total ?? 0)));
    return pcts.reduce((a: any, b: any) => a + b, 0) / pcts.length;
  }, [grades.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Accueil</h1>
          <p className="text-sm text-slate-500">Vue rapide des indicateurs clés.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/notes">Voir les notes</Link>
          </Button>
          <Button asChild>
            <Link href="/vie-scolaire/absences">Marquer les absences</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Widget
          title="Moyenne (approx.)"
          value={grades.isLoading ? <Skeleton className="h-8 w-20" /> : avg ? `${avg.toFixed(1)}%` : '—'}
          hint="Calculée côté client (Academic)"
          href="/notes"
        />
        <Widget
          title="Assiduité"
          value={attendance.isLoading ? <Skeleton className="h-8 w-24" /> : attendance.data?.attendance_rate ? `${attendance.data.attendance_rate}%` : '—'}
          hint="Attendance summary"
          href="/vie-scolaire/absences"
        />
        <Widget
          title="Messages"
          value={inbox.isLoading ? <Skeleton className="h-8 w-16" /> : (inbox.data?.length ?? 0)}
          hint="Inbox (Notification)"
          href="/messagerie"
        />
        <Widget
          title="Documents"
          value={documents.isLoading ? <Skeleton className="h-8 w-16" /> : (documents.data?.length ?? 0)}
          hint="Document service"
          href="/documents"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prochain créneau (semaine)</CardTitle>
        </CardHeader>
        <CardContent>
          {schedule.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : schedule.isError ? (
            <div className="text-sm text-slate-500">Impossible de charger l&apos;emploi du temps.</div>
          ) : (schedule.data?.entries?.length ?? 0) === 0 ? (
            <div className="text-sm text-slate-500">Aucun créneau.</div>
          ) : (
            <div className="space-y-2">
              {schedule.data!.entries.slice(0, 5).map((e: any) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.subject ?? 'Cours'}</div>
                    <div className="text-xs text-slate-500">
                      {e.start_time} → {e.end_time} · {e.room ?? 'Salle ?'}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/emploi-du-temps">Ouvrir</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
