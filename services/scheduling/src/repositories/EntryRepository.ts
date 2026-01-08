import { pool } from "../db.js";

export async function createEntry(data: any) {
  const r = await pool.query(
    `INSERT INTO schedule_entries (school_id,timetable_id,class_id,subject_id,teacher_id,day_of_week,time_slot_id,room)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.school_id,data.timetable_id,data.class_id,data.subject_id,data.teacher_id ?? null,data.day_of_week,data.time_slot_id,data.room ?? null]
  );
  return r.rows[0];
}

export async function listEntries(timetableId: string, classId?: string) {
  const q = classId ? `SELECT * FROM schedule_entries WHERE timetable_id=$1 AND class_id=$2 ORDER BY day_of_week, time_slot_id`
                    : `SELECT * FROM schedule_entries WHERE timetable_id=$1 ORDER BY class_id, day_of_week, time_slot_id`;
  const r = classId ? await pool.query(q,[timetableId,classId]) : await pool.query(q,[timetableId]);
  return r.rows;
}

export async function deleteEntry(id: string) {
  await pool.query("DELETE FROM schedule_entries WHERE id=$1",[id]);
}
