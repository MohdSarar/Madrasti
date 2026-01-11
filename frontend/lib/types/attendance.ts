export type StudentAttendanceStatus = 'present' | 'absent' | 'late';

export type AttendanceMark = {
  student_id: string;
  status: StudentAttendanceStatus;
};

export type AttendanceRecord = {
  id: string;
  school_id?: string;
  class_id?: string;
  date: string; // YYYY-MM-DD
  student_id: string;
  status: StudentAttendanceStatus;
  created_at?: string;
};

export type AttendanceSummary = {
  student_id: string;
  period_id: string;
  present_days?: number;
  absent_days?: number;
  late_days?: number;
  total_days?: number;
  attendance_rate?: number; // 0-100
};
