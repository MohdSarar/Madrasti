import { pool } from "../db.js";

export type ClassRow = {
  id: string;
  school_id: string;
  grade_level_id: string | null;
  academic_year_id: string | null;
  name_ar: string;
  name_en: string | null;
  code: string;
  capacity: number;
  homeroom_teacher_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function createClass(params: {
  schoolId: string;
  gradeLevelId?: string | null;
  academicYearId?: string | null;
  nameAr: string;
  nameEn?: string | null;
  code: string;
  capacity?: number | null;
  homeroomTeacherId?: string | null;
}): Promise<ClassRow> {
  const res = await pool.query(
    `INSERT INTO classes (
      school_id, grade_level_id, academic_year_id,
      name_ar, name_en, code, capacity, homeroom_teacher_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      params.schoolId,
      params.gradeLevelId ?? null,
      params.academicYearId ?? null,
      params.nameAr,
      params.nameEn ?? null,
      params.code,
      params.capacity ?? 30,
      params.homeroomTeacherId ?? null,
    ]
  );
  return res.rows[0] as ClassRow;
}

export async function listClasses(params: { schoolId: string; academicYearId?: string | null; gradeLevelId?: string | null }): Promise<ClassRow[]> {
  const res = await pool.query(
    `SELECT * FROM classes
     WHERE school_id=$1
       AND ($2::uuid IS NULL OR academic_year_id=$2)
       AND ($3::uuid IS NULL OR grade_level_id=$3)
     ORDER BY created_at DESC`,
    [params.schoolId, params.academicYearId ?? null, params.gradeLevelId ?? null]
  );
  return res.rows as ClassRow[];
}
