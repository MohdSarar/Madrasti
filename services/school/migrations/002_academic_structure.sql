-- Academic structure (grade levels + classes) - Step 3 completeness
CREATE TABLE IF NOT EXISTS grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,

  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  code VARCHAR(20) NOT NULL, -- KG1, KG2, 1..12
  level_order INT NOT NULL,
  section VARCHAR(50), -- primary, middle, high

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(school_id, code, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_grade_levels_school ON grade_levels(school_id);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_level_id UUID REFERENCES grade_levels(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,

  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  code VARCHAR(20) NOT NULL,
  capacity INT DEFAULT 30,
  homeroom_teacher_id UUID, -- user id (in user-profile service); keep as UUID without FK
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(school_id, code, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade_level_id);
