-- Attendance Service schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  academic_period_id UUID NOT NULL,
  attendance_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present','absent','tardy','excused','half_day')),
  check_in_time TIME,
  check_out_time TIME,
  late_minutes INTEGER DEFAULT 0,
  remarks TEXT,
  marked_by UUID NOT NULL,
  marked_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS absence_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  is_excused BOOLEAN DEFAULT FALSE,
  requires_documentation BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  absence_reason_id UUID REFERENCES absence_reasons(id),
  request_reason TEXT NOT NULL,
  supporting_documents JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  review_comments TEXT,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  academic_period_id UUID NOT NULL,
  total_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  tardy_days INTEGER DEFAULT 0,
  excused_days INTEGER DEFAULT 0,
  attendance_rate DECIMAL(5,2),
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, academic_period_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_student ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
