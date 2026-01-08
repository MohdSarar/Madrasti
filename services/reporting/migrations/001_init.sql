-- Reporting Service schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('report_card','transcript','progress_report','attendance_report')),
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  layout JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  template_id UUID REFERENCES report_templates(id),
  student_id UUID NOT NULL,
  academic_period_id UUID NOT NULL,
  data JSONB NOT NULL,
  pdf_url TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','final','sent')),
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by UUID,
  finalized_at TIMESTAMP,
  sent_to_parents_at TIMESTAMP,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  period_id UUID NOT NULL,
  metric_data JSONB NOT NULL,
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(metric_type, entity_type, entity_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_student ON generated_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_period ON generated_reports(academic_period_id);
