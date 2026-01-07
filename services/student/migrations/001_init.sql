CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  student_code VARCHAR(50) NOT NULL,

  first_name_ar VARCHAR(100) NOT NULL,
  last_name_ar VARCHAR(100) NOT NULL,
  first_name_en VARCHAR(100),
  last_name_en VARCHAR(100),

  date_of_birth DATE NOT NULL,
  gender VARCHAR(10) NOT NULL,
  national_id VARCHAR(50),
  photo_url TEXT,

  current_grade_level_id UUID,
  current_class_id UUID,
  enrollment_status VARCHAR(20) DEFAULT 'active',
  enrollment_date DATE NOT NULL,

  blood_type VARCHAR(5),
  allergies JSONB DEFAULT '[]',
  medical_conditions JSONB DEFAULT '[]',
  emergency_contact JSONB,

  uses_school_transport BOOLEAN DEFAULT FALSE,
  has_meal_plan BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,

  UNIQUE(school_id, student_code)
);

CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(current_class_id);
