-- Madrasti Auth DB - Init
-- Requires pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin',
    'school_admin',
    'teacher',
    'parent',
    'student',
    'accountant',
    'librarian'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  name_fr VARCHAR(255),
  slug VARCHAR(100) UNIQUE NOT NULL,
  school_type VARCHAR(50),
  logo_url TEXT,
  address JSONB,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  primary_language VARCHAR(2) DEFAULT 'ar',
  timezone VARCHAR(50) DEFAULT 'Africa/Cairo',
  currency VARCHAR(3) DEFAULT 'EGP',
  academic_calendar JSONB,
  settings JSONB,
  subscription_plan VARCHAR(50),
  subscription_status VARCHAR(20),
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255),
  first_name_ar VARCHAR(100),
  last_name_ar VARCHAR(100),
  first_name_en VARCHAR(100),
  last_name_en VARCHAR(100),
  role user_role NOT NULL,
  avatar_url TEXT,
  national_id VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(10),
  address JSONB,
  emergency_contact JSONB,
  preferred_language VARCHAR(2) DEFAULT 'ar',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(100),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_info JSONB,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

-- OTP store (Redis is primary in app; DB table optional for audit if needed later)
