-- Step 4: password reset tokens (Auth service local table)
CREATE TABLE IF NOT EXISTS auth_password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwreset_user_id ON auth_password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pwreset_expires ON auth_password_reset_tokens(expires_at);
