import { pool } from "../db.js";

export type EmailVerificationTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export async function createToken(params: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1,$2,$3)`,
    [params.userId, params.tokenHash, params.expiresAt.toISOString()]
  );
}

export async function consumeToken(params: { tokenHash: string }): Promise<{ userId: string } | null> {
  const res = await pool.query<{ user_id: string }>(
    `UPDATE email_verification_tokens
       SET used_at = NOW()
     WHERE token_hash=$1
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING user_id`,
    [params.tokenHash]
  );
  const row = res.rows[0];
  return row ? { userId: row.user_id } : null;
}

export async function deleteTokensForUser(userId: string): Promise<void> {
  await pool.query(`DELETE FROM email_verification_tokens WHERE user_id=$1`, [userId]);
}
