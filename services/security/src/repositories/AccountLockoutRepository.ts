import { pool } from "../db.js";

export type LockoutRow = {
  user_id: string;
  school_id: string;
  failed_attempts: number;
  locked_until: string | null;
  last_failed_attempt: string | null;
  created_at: string;
  updated_at: string;
};

export class AccountLockoutRepository {
  async get(userId: string): Promise<LockoutRow | null> {
    const res = await pool.query("SELECT * FROM security.account_lockouts WHERE user_id=$1", [userId]);
    return (res.rows[0] as LockoutRow) ?? null;
  }

  async upsert(userId: string, schoolId: string): Promise<void> {
    await pool.query(
      `INSERT INTO security.account_lockouts (user_id, school_id)
       VALUES ($1,$2)
       ON CONFLICT (user_id) DO UPDATE SET school_id=EXCLUDED.school_id, updated_at=NOW()`,
      [userId, schoolId]
    );
  }

  async update(userId: string, patch: { failed_attempts?: number; locked_until?: string | null; last_failed_attempt?: string | null }) {
    const res = await pool.query(
      `UPDATE security.account_lockouts
       SET failed_attempts = COALESCE($2, failed_attempts),
           locked_until = $3,
           last_failed_attempt = $4,
           updated_at = NOW()
       WHERE user_id=$1
       RETURNING *`,
      [userId, patch.failed_attempts ?? null, patch.locked_until ?? null, patch.last_failed_attempt ?? null]
    );
    return res.rows[0] as LockoutRow;
  }

  async reset(userId: string) {
    await pool.query(
      "UPDATE security.account_lockouts SET failed_attempts=0, locked_until=NULL, last_failed_attempt=NULL, updated_at=NOW() WHERE user_id=$1",
      [userId]
    );
  }
}
