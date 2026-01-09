'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { CreateGradeInput, Grade, GradesSummary } from '@/lib/types/grades';

export function useNotes(params?: { periodId?: string }) {
  return useQuery({
    queryKey: ['notes', params],
    queryFn: async () => {
      const { data } = await apiClient.get<Grade[]>('/v1/grades', { params });
      return data;
    }
  });
}

export function useNotesSummary(params?: { periodId?: string }) {
  return useQuery({
    queryKey: ['notes-summary', params],
    queryFn: async () => {
      const { data } = await apiClient.get<GradesSummary>('/v1/grades/summary', { params });
      return data;
    }
  });
}

export function useCreateGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grade: CreateGradeInput) => {
      const { data } = await apiClient.post<Grade>('/v1/grades', grade);
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

