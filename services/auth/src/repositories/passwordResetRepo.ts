import { pool } from "../db.js";

export type PasswordResetTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export async function createResetToken(params: { userId: string; tokenHash: string; expiresAt: Date }) {
  const res = await pool.query(
    `INSERT INTO auth_password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [params.userId, params.tokenHash, params.expiresAt.toISOString()]
  );
  return res.rows[0] as PasswordResetTokenRow;
}

export async function consumeResetToken(params: { tokenHash: string }) {
  // Mark as used atomically if valid and not expired
  const res = await pool.query(
    `UPDATE auth_password_reset_tokens
     SET used_at=NOW()
     WHERE token_hash=$1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING *`,
    [params.tokenHash]
  );
  return (res.rows[0] as PasswordResetTokenRow) ?? null;
}
