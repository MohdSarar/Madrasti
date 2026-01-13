'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authClient } from '@/lib/api/client';

export type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  subject_ids?: string[];
  created_at?: string;
  updated_at?: string;
};

export type CreateTeacherInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  subject_ids?: string[];
};

export type UpdateTeacherInput = Partial<CreateTeacherInput>;

// List all teachers
export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const data = await authClient.get<Teacher[]>('/v1/teachers');
      return data;
    }
  });
}

// Get single teacher
export function useTeacher(teacherId: string) {
  return useQuery({
    queryKey: ['teachers', teacherId],
    enabled: Boolean(teacherId),
    queryFn: async () => {
      const data = await authClient.get<Teacher>(`/v1/teachers/${teacherId}`);
      return data;
    }
  });
}

// Create teacher
export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTeacherInput) => {
      const data = await authClient.post<Teacher>('/v1/teachers', input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Enseignant créé avec succès');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.message || 'Erreur lors de la création';
      toast.error(msg);
    }
  });
}

// Update teacher
export function useUpdateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTeacherInput }) => {
      const result = await authClient.post<Teacher>(`/v1/teachers/${id}`, data);
      return result;
    },
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: ['teachers'] });
      void qc.invalidateQueries({ queryKey: ['teachers', variables.id] });
      toast.success('Enseignant modifié avec succès');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.message || 'Erreur lors de la modification';
      toast.error(msg);
    }
  });
}

// Delete teacher
export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teacherId: string) => {
      const data = await authClient.post(`/v1/teachers/${teacherId}/delete`, {});
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Enseignant supprimé');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.message || 'Erreur lors de la suppression';
      toast.error(msg);
    }
  });
}
