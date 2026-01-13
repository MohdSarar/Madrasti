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

// FIX: Correction du bug "Enregistrer l'appel"
export function useMarkClassAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; class_id: string; marks: AttendanceMark[] }) => {
      // Validation des données avant envoi
      if (!input.date || !input.class_id || !Array.isArray(input.marks)) {
        throw new Error('Données invalides: date, class_id et marks sont requis');
      }

      // Format ISO pour la date
      const formattedDate = new Date(input.date).toISOString().split('T')[0];
      
      const payload = {
        school_id: "00000000-0000-0000-0000-000000000001", // TODO: get from auth context
        class_id: input.class_id,
        academic_period_id: "00000000-0000-0000-0000-000000000002", // TODO: get from context
        attendance_date: formattedDate,
        marked_by: "00000000-0000-0000-0000-000000000003", // TODO: get from auth user
        records: input.marks.map((mark: any) => ({
          student_id: mark.student_id,
          status: mark.status === 'late' ? 'tardy' : mark.status,
          remarks: mark.notes || undefined
        }))
      };

      try {
        const data = await attendanceClient.post(`/api/v1/attendance/mark-class`, payload);
        return data;
      } catch (error: any) {
        // Gestion détaillée des erreurs backend
        const errorMsg = error?.message || 'Erreur réseau';
        console.error('[useMarkClassAttendance] Error:', error);
        throw new Error(errorMsg);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Appel enregistré avec succès');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.message || "Erreur lors de l'enregistrement de l'appel";
      console.error('[useMarkClassAttendance] onError:', e);
      toast.error(msg);
    }
  });
}


