'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authClient } from '@/lib/api/client';

export type Class = {
  id: string;
  name: string;
  level?: string | null;
  academic_year?: string | null;
  teacher_id?: string | null;
  student_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type CreateClassInput = {
  name: string;
  level?: string;
  academic_year?: string;
  teacher_id?: string;
};

export type UpdateClassInput = Partial<CreateClassInput>;

// List all classes
export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const data = await authClient.get<Class[]>('/v1/classes');
      return data;
    }
  });
}

// Get single class
export function useClass(classId: string) {
  return useQuery({
    queryKey: ['classes', classId],
    enabled: Boolean(classId),
    queryFn: async () => {
      const data = await authClient.get<Class>(`/v1/classes/${classId}`);
      return data;
    }
  });
}

// Create class
export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateClassInput) => {
      const data = await authClient.post<Class>('/v1/classes', input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Classe créée avec succès');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.message || 'Erreur lors de la création';
      toast.error(msg);
    }
  });
}

// Update class
export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClassInput }) => {
      const result = await authClient.post<Class>(`/v1/classes/${id}`, data);
      return result;
    },
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: ['classes'] });
      void qc.invalidateQueries({ queryKey: ['classes', variables.id] });
      toast.success('Classe modifiée avec succès');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.message || 'Erreur lors de la modification';
      toast.error(msg);
    }
  });
}

// Delete class
export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (classId: string) => {
      const data = await authClient.post(`/v1/classes/${classId}/delete`, {});
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Classe supprimée');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.message || 'Erreur lors de la suppression';
      toast.error(msg);
    }
  });
}
