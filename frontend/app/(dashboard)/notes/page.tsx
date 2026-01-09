'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { NotesTable } from '@/components/notes/notes-table';
import { useNotes, useNotesSummary } from '@/lib/hooks/use-notes';

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

export default function NotesPage() {
  const { data, isLoading } = useNotes();
  const summary = useNotesSummary();

  const avg = summary.data?.average;
  const rank = summary.data?.rank;
  const total = summary.data?.total ?? data?.length;
  const progress = summary.data?.progress;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Notes</h1>
        <p className="text-sm text-slate-500">Suivi des notes, graphiques et statistiques par matière.</p>
      </div>

      {/* 4 stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Moyenne générale"
          value={summary.isLoading ? <Skeleton className="h-8 w-24" /> : avg != null ? avg.toFixed(2) : '—'}
          hint="Dernière période"
        />
        <StatCard
          title="Classement"
          value={summary.isLoading ? <Skeleton className="h-8 w-20" /> : rank != null ? `#${rank}` : '—'}
          hint="Dans la classe"
        />
        <StatCard
          title="Notes saisies"
          value={isLoading ? <Skeleton className="h-8 w-16" /> : total ?? 0}
          hint="Total"
        />
        <StatCard
          title="Progression"
          value={summary.isLoading ? <Skeleton className="h-8 w-20" /> : progress != null ? `${progress}%` : '—'}
          hint="Sur 30 jours"
        />
      </div>

      <Tabs defaultValue="liste">
        <TabsList className="grid w-full grid-cols-3 md:w-[520px]">
          <TabsTrigger value="liste">Liste</TabsTrigger>
          <TabsTrigger value="graphiques">Graphiques</TabsTrigger>
          <TabsTrigger value="matieres">Par matière</TabsTrigger>
        </TabsList>

        <TabsContent value="liste">
          <Card>
            <CardHeader>
              <CardTitle>Liste des notes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <NotesTable data={data ?? []} isLoading={isLoading} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graphiques">
          <Card>
            <CardHeader>
              <CardTitle>Graphiques</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Placeholder Recharts (Partie 2). Ajoute des courbes par période et par matière.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matieres">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques par matière</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Placeholder (Partie 2).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
