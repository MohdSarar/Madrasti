'use client';

import * as React from 'react';
import { format } from 'date-fns';

import type { Grade } from '@/lib/types/grades';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SortKey = 'subject' | 'date' | 'mark';

function gradeLetter(m: number, total: number) {
  const pct = total > 0 ? (m / total) * 100 : 0;
  if (pct >= 95) return 'A+';
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

function badgeVariant(letter: string) {
  if (letter === 'A+' || letter === 'A') return 'success';
  if (letter === 'B') return 'primary';
  if (letter === 'C' || letter === 'D') return 'warning';
  return 'danger';
}

export function NotesTable({ data, isLoading }: { data: Grade[]; isLoading: boolean }) {
  const [sortKey, setSortKey] = React.useState<SortKey>('date');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const sorted = React.useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'subject') return dir * a.subject_name.localeCompare(b.subject_name);
      if (sortKey === 'mark') {
        const ap = a.marks_total ? a.marks_obtained / a.marks_total : 0;
        const bp = b.marks_total ? b.marks_obtained / b.marks_total : 0;
        return dir * (ap - bp);
      }
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return dir * (ad - bd);
    });
    return copy;
  }, [data, sortKey, sortDir]);

  function toggle(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  }

  if (!isLoading && data.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">Aucune note.</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button variant="ghost" className="-ml-3" onClick={() => toggle('subject')} aria-label="Trier par matière">
                Matière
                <span className={cn('ml-1 text-slate-400', sortKey === 'subject' ? 'opacity-100' : 'opacity-0')}>
                  {sortDir === 'asc' ? '▲' : '▼'}
                </span>
              </Button>
            </TableHead>
            <TableHead>Évaluation</TableHead>
            <TableHead>
              <Button variant="ghost" className="-ml-3" onClick={() => toggle('mark')} aria-label="Trier par note">
                Note
                <span className={cn('ml-1 text-slate-400', sortKey === 'mark' ? 'opacity-100' : 'opacity-0')}>
                  {sortDir === 'asc' ? '▲' : '▼'}
                </span>
              </Button>
            </TableHead>
            <TableHead>Coef</TableHead>
            <TableHead>Badge</TableHead>
            <TableHead>
              <Button variant="ghost" className="-ml-3" onClick={() => toggle('date')} aria-label="Trier par date">
                Date
                <span className={cn('ml-1 text-slate-400', sortKey === 'date' ? 'opacity-100' : 'opacity-0')}>
                  {sortDir === 'asc' ? '▲' : '▼'}
                </span>
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-slate-400">Chargement…</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                </TableRow>
              ))
            : sorted.map((g) => {
                const letter = gradeLetter(g.marks_obtained, g.marks_total);
                const v = badgeVariant(letter);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.subject_name}</TableCell>
                    <TableCell className="text-slate-600">{g.evaluation_name ?? '—'}</TableCell>
                    <TableCell>
                      {g.marks_obtained}/{g.marks_total}
                    </TableCell>
                    <TableCell>{g.coefficient ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={v as any}>{letter}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {g.date ? format(new Date(g.date), 'dd/MM/yyyy') : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}
