import { randomUUID, createHash } from "crypto";
import { client } from "../setup.js";

export async function insertSchool(params?: {
  id?: string;
  slug?: string;
  name_ar?: string;
  primary_language?: string;
}): Promise<{ id: string; slug: string; name_ar: string; primary_language: string }> {
  const id = params?.id ?? randomUUID();
  const slug = params?.slug ?? `school-${id.slice(0, 8)}`;
  const name_ar = params?.name_ar ?? "مدرسة تجريبية";
  const primary_language = params?.primary_language ?? "ar";

  await client.query(
    `INSERT INTO schools (id, slug, name_ar, primary_language)
     VALUES ($1, $2, $3, $4)`,
    [id, slug, name_ar, primary_language]
  );

  return { id, slug, name_ar, primary_language };
}

export async function insertUser(
  params: Partial<{
    id: string;
    email: string;
    password_hash: string;
    role: string;
    school_id: string | null;
    preferred_language: string;
    is_active: boolean;
    two_factor_enabled: boolean;
    two_factor_secret: string | null;
  }> = {}
): Promise<{ id: string; email: string; role: string; school_id: string | null }> {
  const id = params.id ?? randomUUID();
  const email = (params.email ?? `user_${id.slice(0, 8)}@example.com`).toLowerCase();

  // bcrypt hash for 'password' (tests use known value)
  const password_hash =
    params.password_hash ??
    "$2b$10$D7rC8o9R8Gq0zq3mXW1bLe1O48hN4oR4l7e1c6r7nJ0qH/6cOOSue";

  const role = params.role ?? "super_admin";
  const school_id = params.school_id ?? null;
  const preferred_language = params.preferred_language ?? "en";
  const is_active = params.is_active ?? true;
  const two_factor_enabled = params.two_factor_enabled ?? false;
  const two_factor_secret = params.two_factor_secret ?? null;

  // Optional safety: if a school_id is provided but doesn’t exist, create it.
  if (school_id) {
    const exists = await client.query<{ ok: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM schools WHERE id=$1) as ok`,
      [school_id]
    );
    if (!exists.rows[0]?.ok) {
      await insertSchool({ id: school_id, slug: `school-${school_id.slice(0, 8)}` });
    }
  }

  await client.query(
    `INSERT INTO users (
        id, email, password_hash, role, school_id,
        preferred_language, is_active, two_factor_enabled, two_factor_secret
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      email,
      password_hash,
      role,
      school_id,
      preferred_language,
      is_active,
      two_factor_enabled,
      two_factor_secret,
    ]
  );

  return { id, email, role, school_id };
}

export async function insertUserSession(params: {
  user_id: string;
  expires_at?: Date;
  device_info?: Record<string, unknown> | null;
}): Promise<{ id: string; token_hash: string }> {
  const id = randomUUID();
  const expires_at = params.expires_at ?? new Date(Date.now() + 1000 * 60 * 60);
  const token_hash = sha256(`test-refresh-${randomUUID()}`);

  await client.query(
    `INSERT INTO user_sessions (id, user_id, device_info, token_hash, expires_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [id, params.user_id, params.device_info ?? null, token_hash, expires_at]
  );

  return { id, token_hash };
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
