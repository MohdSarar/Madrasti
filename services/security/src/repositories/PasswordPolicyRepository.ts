import { pool } from "../db.js";

export type PasswordPolicy = {
  id: number;
  school_id: string;
  name: string;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  max_age_days: number;
  prevent_reuse_count: number;
  lockout_attempts: number;
  lockout_duration_minutes: number;
  created_at: string;
  updated_at: string;
};

export class PasswordPolicyRepository {
  async getActivePolicy(schoolId: string): Promise<PasswordPolicy | null> {
    const res = await pool.query(
      "SELECT * FROM security.password_policies WHERE school_id=$1 ORDER BY id DESC LIMIT 1",
      [schoolId]
    );
    return (res.rows[0] as PasswordPolicy) ?? null;
  }

  async upsertDefaultIfMissing(schoolId: string): Promise<void> {
    const existing = await this.getActivePolicy(schoolId);
    if (existing) return;
    await pool.query(
      "INSERT INTO security.password_policies (school_id, name) VALUES ($1,'default')",
      [schoolId]
    );
  }

  async list(schoolId?: string): Promise<PasswordPolicy[]> {
    const res = schoolId
      ? await pool.query("SELECT * FROM security.password_policies WHERE school_id=$1 ORDER BY id DESC", [schoolId])
      : await pool.query("SELECT * FROM security.password_policies ORDER BY id DESC");
    return res.rows as PasswordPolicy[];
  }
}
