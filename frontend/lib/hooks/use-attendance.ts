'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { attendanceClient } from '@/lib/api/client';
import type { AttendanceRecord, AttendanceSummary, AttendanceMark } from '@/lib/types/attendance';

export function useAttendanceByDate(date?: string, classId?: string) {
  return useQuery({
    queryKey: ['attendance', 'by-date', date, classId],
    enabled: Boolean(date),
    queryFn: async () => {
      if (!date) return [];
      const path = classId ? `/api/v1/attendance/by-date/${date}/class/${classId}` : `/api/v1/attendance/by-date/${date}`;
      const data = await attendanceClient.get<AttendanceRecord[]>(path);
      return data;
    }
  });
}

export function useAttendanceSummary(studentId?: string, periodId?: string) {
  return useQuery({
    queryKey: ['attendance', 'summary', studentId, periodId],
    enabled: Boolean(studentId && periodId),
    queryFn: async () => {
      if (!studentId || !periodId) return null;
      const data = await attendanceClient.get<AttendanceSummary>(`/api/v1/attendance/summary/${studentId}/${periodId}`);
      return data;
    }
  });
}

export function useMarkClassAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; class_id: string; marks: AttendanceMark[] }) => {
      const data = await attendanceClient.post(`/api/v1/attendance/mark-class`, input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Appel enregistré');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.response?.data?.message || 'Erreur lors de l’enregistrement';
      toast.error(String(msg));
    }
  });
}
