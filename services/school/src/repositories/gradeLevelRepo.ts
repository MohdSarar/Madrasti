import { pool } from "../db.js";

export type GradeLevelRow = {
  id: string;
  school_id: string;
  academic_year_id: string | null;
  name_ar: string;
  name_en: string | null;
  code: string;
  level_order: number;
  section: string | null;
  created_at: string;
  updated_at: string;
};

export async function createGradeLevel(params: {
  schoolId: string;
  academicYearId?: string | null;
  nameAr: string;
  nameEn?: string | null;
  code: string;
  levelOrder: number;
  section?: string | null;
}): Promise<GradeLevelRow> {
  const res = await pool.query(
    `INSERT INTO grade_levels (
      school_id, academic_year_id, name_ar, name_en, code, level_order, section
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      params.schoolId,
      params.academicYearId ?? null,
      params.nameAr,
      params.nameEn ?? null,
      params.code,
      params.levelOrder,
      params.section ?? null,
    ]
  );
  return res.rows[0] as GradeLevelRow;
}

export async function listGradeLevels(params: { schoolId: string; academicYearId?: string | null }): Promise<GradeLevelRow[]> {
  const res = await pool.query(
    `SELECT * FROM grade_levels
     WHERE school_id=$1 AND ($2::uuid IS NULL OR academic_year_id=$2)
     ORDER BY level_order ASC`,
    [params.schoolId, params.academicYearId ?? null]
  );
  return res.rows as GradeLevelRow[];
}
