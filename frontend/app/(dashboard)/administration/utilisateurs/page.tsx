'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/ui/spinner';
import { useStudents, useCreateStudent, useDeleteStudent } from '@/lib/hooks/use-students';
import { useTeachers, useCreateTeacher, useDeleteTeacher } from '@/lib/hooks/use-teachers';
import { Trash2, Edit, Plus } from 'lucide-react';

export default function UtilisateursPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'students'; // 'students' or 'teachers'
  const [search, setSearch] = React.useState('');

  const students = useStudents();
  const teachers = useTeachers();
  
  const isStudents = type === 'students';
  const data = isStudents ? students.data : teachers.data;
  const isLoading = isStudents ? students.isLoading : teachers.isLoading;
  const isError = isStudents ? students.isError : teachers.isError;

  const deleteStudent = useDeleteStudent();
  const deleteTeacher = useDeleteTeacher();

  const filteredData = React.useMemo(() => {
    if (!data) return [];
    const needle = search.toLowerCase();
    return data.filter((item: any) => {
      const fullName = `${item.first_name} ${item.last_name}`.toLowerCase();
      return fullName.includes(needle) || item.email?.toLowerCase().includes(needle);
    });
  }, [data, search]);

  const { paginatedItems, currentPage, totalPages, setPage } = usePagination(filteredData, 20);

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    if (isStudents) {
      await deleteStudent.mutateAsync(id);
    } else {
      await deleteTeacher.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {isStudents ? 'Élèves' : 'Enseignants'}
          </h1>
          <p className="text-sm text-slate-500">
            Gérer les {isStudents ? 'élèves' : 'enseignants'} de l&apos;établissement
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant={isStudents ? 'default' : 'outline'}>
            <a href="/administration/utilisateurs?type=students">Élèves</a>
          </Button>
          <Button asChild variant={!isStudents ? 'default' : 'outline'}>
            <a href="/administration/utilisateurs?type=teachers">Enseignants</a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>
              Liste ({filteredData.length})
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
                Ajouter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <div className="text-sm text-red-500">Erreur lors du chargement</div>
          ) : paginatedItems.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">
              Aucun {isStudents ? 'élève' : 'enseignant'} trouvé
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {item.first_name} {item.last_name}
                      </div>
                      <div className="text-sm text-slate-500">{item.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteStudent.isPending || deleteTeacher.isPending}
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



