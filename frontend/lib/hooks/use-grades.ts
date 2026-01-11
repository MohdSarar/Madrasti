'use client';

import { useQuery } from '@tanstack/react-query';
import { academicClient } from '@/lib/api/client';
import type { GradeRow, Subject } from '@/lib/types/academic';

export function useSubjects() {
  return useQuery({
    queryKey: ['academic', 'subjects'],
    queryFn: async () => {
      const data = await academicClient.get<Subject[]>(`/api/v1/subjects`);
      return data;
    }
  });
}

export function useGradesByStudent(params: { studentId?: string; periodId?: string }) {
  const { studentId, periodId } = params;
  return useQuery({
    queryKey: ['academic', 'grades', studentId, periodId],
    enabled: Boolean(studentId),
    queryFn: async () => {
      if (!studentId) return [];
      const url = periodId ? `/api/v1/grades/by-student/${studentId}?period_id=${periodId}` : `/api/v1/grades/by-student/${studentId}`;
      const data = await academicClient.get<GradeRow[]>(url);
      return data;
    }
  });
}
