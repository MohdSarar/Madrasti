-- Parents management (Step 3)
-- Based on specs (parents + student_parents relationship)

CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,

  first_name_ar VARCHAR(100) NOT NULL,
  last_name_ar VARCHAR(100) NOT NULL,
  first_name_en VARCHAR(100),
  last_name_en VARCHAR(100),

  email VARCHAR(255),
  phone VARCHAR(30),

  relationship_type VARCHAR(50), -- father, mother, guardian, other
  occupation VARCHAR(100),
  employer VARCHAR(100),
  work_phone VARCHAR(30),

  is_primary_contact BOOLEAN DEFAULT FALSE,
  can_pickup_student BOOLEAN DEFAULT TRUE,
  receives_notifications BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_parents_school_id ON parents(school_id);
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parents_phone ON parents(phone);

CREATE TABLE IF NOT EXISTS student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,

  relationship_type VARCHAR(50),
  is_primary BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(student_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_student_parents_student ON student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON student_parents(parent_id);
