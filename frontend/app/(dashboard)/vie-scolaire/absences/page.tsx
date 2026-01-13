'use client';

import * as React from 'react';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMarkClassAttendance } from '@/lib/hooks/use-attendance';
import type { StudentAttendanceStatus } from '@/lib/types/attendance';

type Student = { id: string; name: string; code: string };

const MOCK_STUDENTS: Student[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Student Test', code: 'STD-0001' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Student Two', code: 'STD-0002' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Student Three', code: 'STD-0003' }
];

export default function AbsencesPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [classId, setClassId] = React.useState('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  const [statusById, setStatusById] = React.useState<Record<string, StudentAttendanceStatus>>({});

  const mark = useMarkClassAttendance();
  const markedCount = Object.keys(statusById).length;

  function setAllPresent() {
    const next: Record<string, StudentAttendanceStatus> = {};
    for (const s of MOCK_STUDENTS) next[s.id] = 'present';
    setStatusById(next);
  }

  function setStatus(id: string, status: StudentAttendanceStatus) {
    setStatusById((prev) => ({ ...prev, [id]: status }));
  }

  async function save() {
    const day = date ? format(date, 'yyyy-MM-dd') : null;
    if (!day) return;
    if (!classId.trim()) return;

    const marks = MOCK_STUDENTS.map((s: any) => ({
      student_id: s.id,
      status: statusById[s.id] ?? 'absent'
    }));

    await mark.mutateAsync({ date: day, class_id: classId.trim(), marks });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Marquer les absences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-500 mb-2">Classe (class_id)</div>
              <Input value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="ex: 6A" />
            </div>

            <Calendar mode="single" selected={date} onSelect={setDate} />

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={setAllPresent}>
                Tout présent
              </Button>
              <Badge variant="outline">{markedCount}/{MOCK_STUDENTS.length} marqués</Badge>
            </div>

            <Button onClick={save} className="w-full" disabled={mark.isPending || !date || !classId.trim()}>
              {mark.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Élèves (MVP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_STUDENTS.map((s: any) => {
            const status = statusById[s.id];
            return (
              <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{s.name.split(' ').map((w: any) => w[0]).join('').slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.code}</div>
                  </div>
                  <div className="ml-auto text-xs text-slate-500">
                    {status ? <span className="font-medium">{status}</span> : <span>non marqué</span>}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant={status === 'present' ? 'default' : 'outline'} onClick={() => setStatus(s.id, 'present')}>
                    Présent
                  </Button>
                  <Button variant={status === 'absent' ? 'destructive' : 'outline'} onClick={() => setStatus(s.id, 'absent')}>
                    Absent
                  </Button>
                  <Button variant={status === 'late' ? 'secondary' : 'outline'} onClick={() => setStatus(s.id, 'late')}>
                    Retard
                  </Button>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-slate-500">
            TODO: remplacer MOCK_STUDENTS par Student Service (quand l’endpoint liste des élèves est branché au gateway).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


