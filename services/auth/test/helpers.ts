import { client } from "./setup.js";
import { randomUUID } from "crypto";
import speakeasy from "speakeasy";

export type SchoolRow = {
  id: string;
  slug: string;
  name_ar: string;
  primary_language: string;
};

export type UserRole =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "parent"
  | "student"
  | "accountant"
  | "librarian";

export type UserParams = {
  email: string;
  password: string;
  role: UserRole;
  schoolId?: string | null;
  isActive?: boolean;
  preferredLanguage?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecretBase32?: string | null;
};

export async function createSchool(
  overrides?: Partial<{ slug: string; name_ar: string; primary_language: string; id: string }>
): Promise<SchoolRow> {
  const id = overrides?.id ?? randomUUID();
  const slug = overrides?.slug ?? `school-${id.slice(0, 8)}`;
  const name_ar = overrides?.name_ar ?? "مدرستي";
  const primary_language = overrides?.primary_language ?? "ar";

  const res = await client.query<SchoolRow>(
    `INSERT INTO schools (id, name_ar, slug, primary_language)
     VALUES ($1, $2, $3, $4)
     RETURNING id, slug, name_ar, primary_language`,
    [id, name_ar, slug, primary_language]
  );

  const row = res.rows[0];
  if (!row) throw new Error("createSchool: INSERT returned no row");
  return row;
}

async function ensureSchoolExists(schoolId: string): Promise<void> {
  // Insert a minimal school row if it doesn't exist (id-based ON CONFLICT).
  await client.query(
    `INSERT INTO schools (id, slug, name_ar, primary_language)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [schoolId, `s-${schoolId.slice(0, 8)}`, "مدرسة تجريبية", "ar"]
  );
}

export async function insertUser(params: UserParams): Promise<{ id: string }> {
  const { hashPassword } = await import("../src/services/password.js");
  const passwordHash = await hashPassword(params.password);

  if (params.schoolId) {
    await ensureSchoolExists(params.schoolId);
  }

  const res = await client.query<{ id: string }>(
    `INSERT INTO users (
        school_id,
        email,
        password_hash,
        role,
        preferred_language,
        is_active,
        two_factor_enabled,
        two_factor_secret
      )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      params.schoolId ?? null,
      params.email.toLowerCase(),
      passwordHash,
      params.role,
      params.preferredLanguage ?? "ar",
      params.isActive ?? true,
      params.twoFactorEnabled ?? false,
      params.twoFactorSecretBase32 ?? null,
    ]
  );

  const row = res.rows[0];
  if (!row) throw new Error("insertUser: INSERT returned no row");
  return row;
}

export async function findUserByEmail(email: string): Promise<{
  id: string;
  school_id: string | null;
  role: string;
  is_active: boolean;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
} | null> {
  const res = await client.query<{
    id: string;
    school_id: string | null;
    role: string;
    is_active: boolean;
    two_factor_enabled: boolean;
    two_factor_secret: string | null;
  }>(
    `SELECT id, school_id, role, is_active, two_factor_enabled, two_factor_secret
     FROM users WHERE email=$1 LIMIT 1`,
    [email.toLowerCase()]
  );

  return res.rows[0] ?? null;
}

export async function countActiveSessions(userId: string): Promise<number> {
  const res = await client.query<{ c: string }>(
    `SELECT COUNT(*)::text as c
     FROM user_sessions
     WHERE user_id=$1 AND expires_at > NOW()`,
    [userId]
  );
  return parseInt(res.rows[0]?.c ?? "0", 10);
}

export async function expireSessionsForUser(userId: string, count: number): Promise<void> {
  // Expire the newest N active sessions.
  await client.query(
    `WITH s AS (
       SELECT id
       FROM user_sessions
       WHERE user_id=$1 AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT $2
     )
     UPDATE user_sessions
     SET expires_at = NOW() - INTERVAL '1 hour'
     WHERE id IN (SELECT id FROM s)`,
    [userId, count]
  );
}

export function generateTOTP(secretBase32: string): string {
  return speakeasy.totp({ secret: secretBase32, encoding: "base32" });
}
