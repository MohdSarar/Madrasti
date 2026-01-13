'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authClient } from '@/lib/api/client';

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  date_of_birth?: string | null;
  class_id?: string | null;
  parent_email?: string | null;
  parent_phone?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateStudentInput = {
  first_name: string;
  last_name: string;
  email?: string;
  date_of_birth?: string;
  class_id?: string;
  parent_email?: string;
  parent_phone?: string;
};

export type UpdateStudentInput = Partial<CreateStudentInput>;

// List all students
export function useStudents(classId?: string) {
  return useQuery({
    queryKey: ['students', classId],
    queryFn: async () => {
      const url = classId ? `/v1/students?class_id=${classId}` : '/v1/students';
      const data = await authClient.get<Student[]>(url);
      return data;
    }
  });
}

// Get single student
export function useStudent(studentId: string) {
  return useQuery({
    queryKey: ['students', studentId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      const data = await authClient.get<Student>(`/v1/students/${studentId}`);
      return data;
    }
  });
}

// Create student
export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStudentInput) => {
      const data = await authClient.post<Student>('/v1/students', input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Élève créé avec succès');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.message || 'Erreur lors de la création';
      toast.error(msg);
    }
  });
}

// Update student
export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStudentInput }) => {
      const result = await authClient.post<Student>(`/v1/students/${id}`, data);
      return result;
    },
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: ['students'] });
      void qc.invalidateQueries({ queryKey: ['students', variables.id] });
      toast.success('Élève modifié avec succès');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.message || 'Erreur lors de la modification';
      toast.error(msg);
    }
  });
}

// Delete student
export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const data = await authClient.post(`/v1/students/${studentId}/delete`, {});
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Élève supprimé');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.message || 'Erreur lors de la suppression';
      toast.error(msg);
    }
  });
}
