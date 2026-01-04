import { pool } from "../db.js";
import type { UserRole } from "../domain/roles.js";

export type UserRow = {
  id: string;
  school_id: string | null;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  role: UserRole;
  preferred_language: string | null;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  is_active: boolean;
};

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const res = await pool.query<UserRow>(
    `SELECT id, school_id, email, phone, password_hash, role, preferred_language,
            two_factor_enabled, two_factor_secret, is_active
     FROM users WHERE email=$1 LIMIT 1`,
    [email.toLowerCase()]
  );
  return res.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const res = await pool.query<UserRow>(
    `SELECT id, school_id, email, phone, password_hash, role, preferred_language,
            two_factor_enabled, two_factor_secret, is_active
     FROM users WHERE id=$1 LIMIT 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function createUser(params: {
  schoolId: string | null;
  email?: string | null;
  phone?: string | null;
  passwordHash?: string | null;
  role: UserRole;
  preferredLanguage?: string;
  firstNameAr?: string;
  lastNameAr?: string;
}): Promise<{ id: string }> {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO users (school_id, email, phone, password_hash, role, preferred_language, first_name_ar, last_name_ar)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      params.schoolId,
      params.email?.toLowerCase() ?? null,
      params.phone ?? null,
      params.passwordHash ?? null,
      params.role,
      params.preferredLanguage ?? "ar",
      params.firstNameAr ?? null,
      params.lastNameAr ?? null,
    ]
  );
  return res.rows[0];
}

export async function setUser2faSecret(userId: string, secretBase32: string): Promise<void> {
  await pool.query(
    `UPDATE users SET two_factor_secret=$2 WHERE id=$1`,
    [userId, secretBase32]
  );
}

export async function enableUser2fa(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET two_factor_enabled=true WHERE id=$1`,
    [userId]
  );
}

export async function markUserLastLogin(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET last_login_at=NOW() WHERE id=$1`,
    [userId]
  );
}
