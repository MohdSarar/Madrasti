import { pool } from "../db.js";

export async function createReport(data: {
  school_id: string;
  student_id: string;
  academic_period_id: string;
  report_type: string;
  generated_by: string;
  template_id?: string;
  data?: any;
}) {
  const r = await pool.query(
    `
    INSERT INTO generated_reports 
      (school_id, report_type, template_id, student_id, academic_period_id, data, status, generated_by)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) 
    RETURNING *
    `,
    [
      data.school_id,
      data.report_type,
      data.template_id ?? null,
      data.student_id,
      data.academic_period_id,
      JSON.stringify(data.data ?? {}),
      data.generated_by
    ]
  );
  return r.rows[0];
}

export async function getReport(id: string) {
  const r = await pool.query(
    `SELECT * FROM generated_reports WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function listReports(schoolId: string, studentId?: string) {
  if (studentId) {
    const r = await pool.query(
      `
      SELECT * FROM generated_reports 
      WHERE school_id = $1 AND student_id = $2 
      ORDER BY generated_at DESC
      `,
      [schoolId, studentId]
    );
    return r.rows;
  } else {
    const r = await pool.query(
      `
      SELECT * FROM generated_reports 
      WHERE school_id = $1 
      ORDER BY generated_at DESC
      `,
      [schoolId]
    );
    return r.rows;
  }
}

export async function updateStatus(
  id: string, 
  status: "pending" | "completed" | "failed",
  errorMessage?: string
) {
  const r = await pool.query(
    `
    UPDATE generated_reports
    SET status = $2,
        error_message = $3,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [id, status, errorMessage ?? null]
  );
  return r.rows[0];
}
