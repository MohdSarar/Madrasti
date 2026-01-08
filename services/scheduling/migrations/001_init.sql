-- Scheduling Service schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  slot_type VARCHAR(20) CHECK (slot_type IN ('academic','break','lunch','activity')),
  day_of_week INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  academic_year_id UUID NOT NULL,
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  timetable_id UUID NOT NULL REFERENCES timetables(id),
  class_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  teacher_id UUID,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  time_slot_id UUID NOT NULL REFERENCES time_slots(id),
  room VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN ('holiday','event','substitution','cancellation')),
  exception_date DATE NOT NULL,
  all_day BOOLEAN DEFAULT TRUE,
  time_slot_id UUID REFERENCES time_slots(id),
  affected_classes JSONB DEFAULT '[]',
  title_ar VARCHAR(200) NOT NULL,
  description TEXT,
  replacement_teacher_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_timetable ON schedule_entries(timetable_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_class ON schedule_entries(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_teacher ON schedule_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON schedule_exceptions(exception_date);
