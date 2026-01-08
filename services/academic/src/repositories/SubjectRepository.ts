import { pool } from "../db.js";

export async function listSubjects(params: { schoolId: string; gradeLevelId?: string }) {
  const { schoolId, gradeLevelId } = params;
  const q = gradeLevelId
    ? "SELECT * FROM subjects WHERE school_id=$1 AND grade_level_id=$2 ORDER BY code"
    : "SELECT * FROM subjects WHERE school_id=$1 ORDER BY code";
  const r = gradeLevelId ? await pool.query(q, [schoolId, gradeLevelId]) : await pool.query(q, [schoolId]);
  return r.rows;
}

export async function getSubject(id: string) {
  const r = await pool.query("SELECT * FROM subjects WHERE id=$1", [id]);
  return r.rows[0] ?? null;
}

export async function createSubject(data: any) {
  const r = await pool.query(
    `INSERT INTO subjects (school_id, code, name_ar, name_en, grade_level_id, credits, pass_threshold, is_active)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,1.0),COALESCE($7,50),COALESCE($8,true))
     RETURNING *`,
    [data.school_id, data.code, data.name_ar, data.name_en ?? null, data.grade_level_id, data.credits ?? null, data.pass_threshold ?? null, data.is_active ?? null]
  );
  return r.rows[0];
}

export async function updateSubject(id: string, patch: any) {
  const current = await getSubject(id);
  if (!current) return null;
  const merged = { ...current, ...patch };
  const r = await pool.query(
    `UPDATE subjects SET code=$2, name_ar=$3, name_en=$4, grade_level_id=$5, credits=$6, pass_threshold=$7, is_active=$8, updated_at=NOW()
     WHERE id=$1 RETURNING *`,
    [id, merged.code, merged.name_ar, merged.name_en, merged.grade_level_id, merged.credits, merged.pass_threshold, merged.is_active]
  );
  return r.rows[0];
}

export async function deleteSubject(id: string) {
  await pool.query("DELETE FROM subjects WHERE id=$1", [id]);
}
