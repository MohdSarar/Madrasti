import { pool } from "../db.js";

export type SchoolRow = {
  id: string;
  name_ar: string;
  slug: string;
  primary_language: string;
};

export async function createSchool(params: {
  nameAr: string;
  nameEn?: string | null;
  nameFr?: string | null;
  slug: string;
  schoolType?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  primaryLanguage?: string | null;
}): Promise<{ id: string }> {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO schools (name_ar, name_en, name_fr, slug, school_type, contact_email, contact_phone, primary_language)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      params.nameAr,
      params.nameEn ?? null,
      params.nameFr ?? null,
      params.slug,
      params.schoolType ?? null,
      params.contactEmail ?? null,
      params.contactPhone ?? null,
      params.primaryLanguage ?? "ar",
    ]
  );

  const row = res.rows[0];
  if (!row) {
    // This should not happen unless DB is misbehaving or query changed.
    throw new Error("createSchool: INSERT returned no row");
  }

  return { id: row.id };
}

export async function findSchoolBySlug(slug: string): Promise<SchoolRow | null> {
  const res = await pool.query<SchoolRow>(
    `SELECT id, name_ar, slug, primary_language
     FROM schools WHERE slug=$1 LIMIT 1`,
    [slug]
  );
  return res.rows[0] ?? null;
}
