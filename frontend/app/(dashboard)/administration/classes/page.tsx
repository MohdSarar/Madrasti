'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/ui/spinner';
import { useClasses, useDeleteClass } from '@/lib/hooks/use-classes';
import { Trash2, Edit, Plus, Users } from 'lucide-react';

export default function ClassesPage() {
  const [search, setSearch] = React.useState('');
  const classes = useClasses();
  const deleteClass = useDeleteClass();

  const filteredData = React.useMemo(() => {
    if (!classes.data) return [];
    const needle = search.toLowerCase();
    return classes.data.filter((item: any) => {
      return item.name?.toLowerCase().includes(needle) || 
             item.level?.toLowerCase().includes(needle);
    });
  }, [classes.data, search]);

  const { paginatedItems, currentPage, totalPages, setPage } = usePagination(filteredData, 20);

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) return;
    await deleteClass.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Classes</h1>
          <p className="text-sm text-slate-500">
            Gérer les classes de l&apos;établissement
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>
              Liste des classes ({filteredData.length})
            </CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Créer une classe
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {classes.isLoading ? (
            <LoadingState />
          ) : classes.isError ? (
            <div className="text-sm text-red-500">Erreur lors du chargement</div>
          ) : paginatedItems.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">
              Aucune classe trouvée
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-4 space-y-3"
                  >
                    <div>
                      <div className="font-semibold text-lg">{item.name}</div>
                      {item.level && (
                        <div className="text-sm text-slate-500">Niveau: {item.level}</div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Users className="h-4 w-4" />
                      <span>{item.student_count || 0} élèves</span>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteClass.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



