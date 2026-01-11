'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { academicClient } from '@/lib/api/client';
import type { CreateGradeInput, Grade, GradesSummary } from '@/lib/types/grades';

export function useNotes(params?: { periodId?: string }) {
  return useQuery({
    queryKey: ['notes', params],
    queryFn: async () => {
      const url = params?.periodId ? `/api/v1/grades?period_id=${params.periodId}` : '/api/v1/grades';
      const data = await academicClient.get<Grade[]>(url);
      return data;
    }
  });
}

export function useNotesSummary(params?: { periodId?: string }) {
  return useQuery({
    queryKey: ['notes-summary', params],
    queryFn: async () => {
      const url = params?.periodId ? `/api/v1/grades/summary?period_id=${params.periodId}` : '/api/v1/grades/summary';
      const data = await academicClient.get<GradesSummary>(url);
      return data;
    }
  });
}

export function useCreateGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grade: CreateGradeInput) => {
      const data = await academicClient.post<Grade>('/api/v1/grades', grade);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      void queryClient.invalidateQueries({ queryKey: ['notes-summary'] });
      toast.success('Note enregistrée');
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement");
    }
  });
}
