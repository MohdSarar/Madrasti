import { pool } from "../db.js";

export async function createLeave(data: any) {
  const r = await pool.query(
    `INSERT INTO leave_requests (school_id, student_id, start_date, end_date, absence_reason_id, request_reason, requested_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.school_id,data.student_id,data.start_date,data.end_date,data.absence_reason_id ?? null,data.request_reason,data.requested_by]
  );
  return r.rows[0];
}

export async function listLeaves(schoolId: string, status?: string) {
  const q = status ? `SELECT * FROM leave_requests WHERE school_id=$1 AND status=$2 ORDER BY requested_at DESC`
                   : `SELECT * FROM leave_requests WHERE school_id=$1 ORDER BY requested_at DESC`;
  const r = status ? await pool.query(q, [schoolId,status]) : await pool.query(q, [schoolId]);
  return r.rows;
}

export async function setStatus(id: string, status: "approved"|"rejected", reviewedBy: string, comments?: string) {
  const r = await pool.query(
    `UPDATE leave_requests SET status=$2, reviewed_by=$3, reviewed_at=NOW(), review_comments=$4 WHERE id=$1 RETURNING *`,
    [id,status,reviewedBy,comments ?? null]
  );
  return r.rows[0] ?? null;
}
