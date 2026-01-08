import { pool } from "../db.js";

export async function upsertGrade(row: any) {
  const r = await pool.query(
    `INSERT INTO grades (school_id, assessment_id, student_id, marks_obtained, marks_total, percentage, grade_letter, grade_points, remarks, status, graded_by, graded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'final',$10,NOW())
     ON CONFLICT (assessment_id, student_id)
     DO UPDATE SET marks_obtained=EXCLUDED.marks_obtained, marks_total=EXCLUDED.marks_total, percentage=EXCLUDED.percentage, grade_letter=EXCLUDED.grade_letter, grade_points=EXCLUDED.grade_points, remarks=EXCLUDED.remarks, status='final', graded_by=EXCLUDED.graded_by, graded_at=NOW()
     RETURNING *`,
    [row.school_id, row.assessment_id, row.student_id, row.marks_obtained, row.marks_total, row.percentage, row.grade_letter, row.grade_points, row.remarks ?? null, row.graded_by]
  );
  return r.rows[0];
}

export async function listGradesByStudent(params: { studentId: string; periodId?: string }) {
  if (params.periodId) {
    const r = await pool.query(
      `SELECT g.*, a.academic_period_id, a.subject_id FROM grades g
       JOIN assessments a ON a.id=g.assessment_id
       WHERE g.student_id=$1 AND a.academic_period_id=$2
       ORDER BY g.created_at DESC`,
      [params.studentId, params.periodId]
    );
    return r.rows;
  }
  const r = await pool.query(`SELECT * FROM grades WHERE student_id=$1 ORDER BY created_at DESC`, [params.studentId]);
  return r.rows;
}
