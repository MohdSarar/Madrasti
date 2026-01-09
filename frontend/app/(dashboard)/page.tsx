import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardHomePage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="text-slate-500">Accédez rapidement aux modules principaux.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Consulter les notes, statistiques et graphiques.</p>
            <Link className="mt-3 inline-block text-sm font-medium text-primary-600 underline-offset-4 hover:underline" href="/notes">
              Ouvrir
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vie scolaire</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Marquer les absences et retards.</p>
            <Link className="mt-3 inline-block text-sm font-medium text-primary-600 underline-offset-4 hover:underline" href="/vie-scolaire/absences">
              Ouvrir
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Accéder aux documents et bulletins.</p>
            <Link className="mt-3 inline-block text-sm font-medium text-primary-600 underline-offset-4 hover:underline" href="/documents">
              Ouvrir
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
