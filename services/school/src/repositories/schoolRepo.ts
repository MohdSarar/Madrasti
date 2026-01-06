import { pool } from "../db.js";

export type SchoolRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  school_type: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
};

export async function createSchool(params: {
  slug: string;
  name_ar: string;
  name_en?: string | null;
  school_type: string;
  subscription_plan?: string;
  max_students?: number;
}): Promise<SchoolRow> {
  const res = await pool.query<SchoolRow>(
    `INSERT INTO schools (slug, name_ar, name_en, school_type, subscription_plan, max_students)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, slug, name_ar, name_en, school_type, subscription_plan, subscription_status, created_at`,
    [
      params.slug,
      params.name_ar,
      params.name_en ?? null,
      params.school_type,
      params.subscription_plan ?? "basic",
      params.max_students ?? 200,
    ]
  );
  const row = res.rows[0];
  if (!row) throw new Error("createSchool: INSERT returned no row");
  return row;
}

export async function listSchools(): Promise<SchoolRow[]> {
  const res = await pool.query<SchoolRow>(
    `SELECT id, slug, name_ar, name_en, school_type, subscription_plan, subscription_status, created_at FROM schools ORDER BY created_at DESC`
  );
  return res.rows;
}

export async function findSchoolBySlug(slug: string): Promise<SchoolRow | null> {
  const res = await pool.query<SchoolRow>(
    `SELECT id, slug, name_ar, name_en, school_type, subscription_plan, subscription_status, created_at FROM schools WHERE slug=$1 LIMIT 1`,
    [slug]
  );
  return res.rows[0] ?? null;
}
