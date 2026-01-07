-- Step 4: Security & Compliance schema (shared Postgres)
-- Requires pgcrypto for gen_random_uuid()

CREATE SCHEMA IF NOT EXISTS security;

CREATE TABLE IF NOT EXISTS security.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  event_source VARCHAR(100) NOT NULL,
  user_id UUID,
  school_id UUID,
  ip_address INET,
  user_agent TEXT,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  details JSONB,
  severity VARCHAR(20) DEFAULT 'INFO',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON security.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_school_id ON security.audit_events(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON security.audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON security.audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_details_gin ON security.audit_events USING GIN(details);

CREATE TABLE IF NOT EXISTS security.password_policies (
  id SERIAL PRIMARY KEY,
  school_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  min_length INTEGER DEFAULT 10,
  require_uppercase BOOLEAN DEFAULT true,
  require_lowercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_special_chars BOOLEAN DEFAULT true,
  max_age_days INTEGER DEFAULT 90,
  prevent_reuse_count INTEGER DEFAULT 5,
  lockout_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS security.password_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON security.password_history(user_id);

CREATE TABLE IF NOT EXISTS security.account_lockouts (
  user_id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_failed_attempt TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security.gdpr_requests (
  user_id UUID PRIMARY KEY,
  school_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'received',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
