import { pool } from "../db.js";

export async function upsertAttendance(row: any) {
  const r = await pool.query(
    `INSERT INTO attendance_records (school_id, student_id, class_id, academic_period_id, attendance_date, day_of_week, status, late_minutes, remarks, marked_by, marked_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,0),$9,$10,NOW())
     ON CONFLICT (student_id, attendance_date)
     DO UPDATE SET status=EXCLUDED.status, late_minutes=EXCLUDED.late_minutes, remarks=EXCLUDED.remarks, marked_by=EXCLUDED.marked_by, marked_at=NOW()
     RETURNING *`,
    [row.school_id,row.student_id,row.class_id,row.academic_period_id,row.attendance_date,row.day_of_week,row.status,row.late_minutes ?? 0,row.remarks ?? null,row.marked_by]
  );
  return r.rows[0];
}

export async function listByDate(schoolId: string, date: string, classId?: string) {
  if (classId) {
    const r = await pool.query(`SELECT * FROM attendance_records WHERE school_id=$1 AND attendance_date=$2 AND class_id=$3 ORDER BY student_id`, [schoolId,date,classId]);
    return r.rows;
  }
  const r = await pool.query(`SELECT * FROM attendance_records WHERE school_id=$1 AND attendance_date=$2 ORDER BY class_id, student_id`, [schoolId,date]);
  return r.rows;
}

export async function listByStudent(studentId: string) {
  const r = await pool.query(`SELECT * FROM attendance_records WHERE student_id=$1 ORDER BY attendance_date DESC`, [studentId]);
  return r.rows;
}


export async function getSummary(studentId: string, periodId: string) {
  const r = await pool.query(
    `SELECT * FROM attendance_summary WHERE student_id=$1 AND academic_period_id=$2 LIMIT 1`,
    [studentId, periodId]
  );
  return r.rows[0] ?? {
    student_id: studentId,
    academic_period_id: periodId,
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    tardy_days: 0,
    excused_days: 0,
    attendance_rate: 0,
  };
}
