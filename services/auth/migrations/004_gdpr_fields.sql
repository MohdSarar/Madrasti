-- Step 4: GDPR deletion markers / minimization flags
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gdpr_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gdpr_reason TEXT;
