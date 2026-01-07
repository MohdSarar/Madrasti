import { pool } from "../db.js";

export class PasswordHistoryRepository {
  async record(userId: string, passwordHash: string): Promise<void> {
    await pool.query(
      "INSERT INTO security.password_history (user_id,password_hash) VALUES ($1,$2)",
      [userId, passwordHash]
    );
  }

  async listRecent(userId: string, limit: number): Promise<string[]> {
    const res = await pool.query(
      "SELECT password_hash FROM security.password_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2",
      [userId, limit]
    );
    return res.rows.map((r) => r.password_hash as string);
  }
}
