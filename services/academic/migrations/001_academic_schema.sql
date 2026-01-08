-- Academic Service schema (public)
-- Requires pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  code VARCHAR(20) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  grade_level_id UUID NOT NULL,
  credits DECIMAL(3,1) DEFAULT 1.0,
  pass_threshold INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, code, grade_level_id)
);

CREATE TABLE IF NOT EXISTS assessment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  weight_percentage DECIMAL(5,2),
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  assessment_type_id UUID NOT NULL REFERENCES assessment_types(id),
  title_ar VARCHAR(200) NOT NULL,
  academic_period_id UUID NOT NULL,
  scheduled_date DATE,
  total_marks INTEGER NOT NULL,
  weight DECIMAL(5,2),
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  assessment_id UUID NOT NULL REFERENCES assessments(id),
  student_id UUID NOT NULL,
  marks_obtained DECIMAL(6,2),
  marks_total INTEGER NOT NULL,
  percentage DECIMAL(5,2),
  grade_letter VARCHAR(5),
  grade_points DECIMAL(3,2),
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  graded_by UUID,
  graded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(assessment_id, student_id),
  CHECK (marks_obtained >= 0),
  CHECK (marks_obtained <= marks_total)
);

CREATE TABLE IF NOT EXISTS grade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES grades(id),
  old_marks DECIMAL(6,2),
  new_marks DECIMAL(6,2),
  changed_by UUID NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_gpa_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  academic_period_id UUID NOT NULL,
  gpa DECIMAL(3,2),
  cgpa DECIMAL(3,2),
  total_credits_earned DECIMAL(5,1),
  rank_in_class INTEGER,
  rank_in_grade INTEGER,
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, academic_period_id)
);

CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_assessments_school ON assessments(school_id);
CREATE INDEX IF NOT EXISTS idx_assessments_period ON assessments(academic_period_id);
CREATE INDEX IF NOT EXISTS idx_grades_school ON grades(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_assessment ON grades(assessment_id);
CREATE INDEX IF NOT EXISTS idx_gpa_cache_student ON student_gpa_cache(student_id);
