CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  school_type VARCHAR(50) NOT NULL,
  logo_url TEXT,
  address JSONB NOT NULL DEFAULT '{}',
  contact_email VARCHAR(255) NOT NULL DEFAULT 'admin@example.com',
  contact_phone VARCHAR(20) NOT NULL DEFAULT 'N/A',
  primary_language VARCHAR(2) DEFAULT 'ar',
  timezone VARCHAR(50) DEFAULT 'Africa/Cairo',
  currency VARCHAR(3) DEFAULT 'EGP',
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  subscription_status VARCHAR(20) DEFAULT 'active',
  max_students INT DEFAULT 200,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name_ar VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS academic_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name_ar VARCHAR(100) NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  period_number INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  CHECK (period_type IN ('semester','trimester','quarter'))
);
