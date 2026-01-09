'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Student = { id: string; name: string; code: string };

type Status = 'present' | 'absent' | 'late';

const MOCK_STUDENTS: Student[] = [
  { id: 's1', name: 'Alice Martin', code: 'A-001' },
  { id: 's2', name: 'Youssef Benali', code: 'A-002' },
  { id: 's3', name: 'Sarah Diallo', code: 'A-003' },
  { id: 's4', name: 'Hugo Bernard', code: 'A-004' }
];

export default function AbsencesPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [statusById, setStatusById] = React.useState<Record<string, Status>>({});

  const markedCount = Object.keys(statusById).length;

  function setAllPresent() {
    const next: Record<string, Status> = {};
    for (const s of MOCK_STUDENTS) next[s.id] = 'present';
    setStatusById(next);
  }

  function setStatus(id: string, status: Status) {
    setStatusById((prev) => ({ ...prev, [id]: status }));
  }

  async function save() {
    // TODO: replace with real API call
    toast.success('Appel enregistré', {
      description: `${markedCount}/${MOCK_STUDENTS.length} élèves marqués · ${date ? format(date, 'dd/MM/yyyy') : ''}`
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Marquer les absences</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar mode="single" selected={date} onSelect={setDate} />
          <p className="mt-3 text-sm text-slate-500">
            Date sélectionnée : <span className="font-medium">{date ? format(date, 'dd/MM/yyyy') : '—'}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={setAllPresent}>
              Tous présents
            </Button>
            <div className="ml-auto text-sm text-slate-500 self-center">
              {markedCount}/{MOCK_STUDENTS.length} élèves marqués
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={save} className="w-full">
              Register Call
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Élèves</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_STUDENTS.map((s) => {
            const status = statusById[s.id];
            return (
              <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{s.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.code}</div>
                  </div>
                  <div className="ml-auto text-xs text-slate-500">
                    {status ? (
                      <span className="font-medium">
                        {status === 'present' ? 'Présent' : status === 'absent' ? 'Absent' : 'Retard'}
                      </span>
                    ) : (
                      'Non marqué'
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button
                    variant={status === 'present' ? 'default' : 'outline'}
                    onClick={() => setStatus(s.id, 'present')}
                  >
                    Présent
                  </Button>
                  <Button
                    variant={status === 'absent' ? 'destructive' : 'outline'}
                    onClick={() => setStatus(s.id, 'absent')}
                  >
                    Absent
                  </Button>
                  <Button
                    variant={status === 'late' ? 'secondary' : 'outline'}
                    onClick={() => setStatus(s.id, 'late')}
                  >
                    Retard
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
