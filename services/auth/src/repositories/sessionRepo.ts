import { pool } from "../db.js";
import { sha256 } from "../utils/crypto.js";

export type SessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
};

export async function countActiveSessions(userId: string): Promise<number> {
  const res = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text as c FROM user_sessions
     WHERE user_id=$1 AND expires_at > NOW()`,
    [userId]
  );
  return parseInt(res.rows[0]?.c ?? "0", 10);
}

export async function createSession(params: {
  userId: string;
  token: string; // refresh token (or placeholder)
  expiresAt: Date;
  deviceInfo: Record<string, string | null>;
}): Promise<{ id: string }> {
  const tokenHash = sha256(params.token);
  const res = await pool.query<{ id: string }>(
    `INSERT INTO user_sessions (user_id, device_info, token_hash, expires_at)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [params.userId, params.deviceInfo, tokenHash, params.expiresAt]
  );
  return res.rows[0];
}

export async function updateSessionToken(sessionId: string, refreshToken: string): Promise<void> {
  const tokenHash = sha256(refreshToken);
  await pool.query(`UPDATE user_sessions SET token_hash=$2 WHERE id=$1`, [sessionId, tokenHash]);
}

export async function deleteSessionById(sessionId: string): Promise<void> {
  await pool.query(`DELETE FROM user_sessions WHERE id=$1`, [sessionId]);
}

export async function deleteSessionByToken(refreshToken: string): Promise<void> {
  const tokenHash = sha256(refreshToken);
  await pool.query(`DELETE FROM user_sessions WHERE token_hash=$1`, [tokenHash]);
}

export async function getSessionByToken(refreshToken: string): Promise<SessionRow | null> {
  const tokenHash = sha256(refreshToken);
  const res = await pool.query<SessionRow>(
    `SELECT id, user_id, token_hash, expires_at
     FROM user_sessions WHERE token_hash=$1 LIMIT 1`,
    [tokenHash]
  );
  return res.rows[0] ?? null;
}
