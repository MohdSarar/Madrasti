import { pool } from "../db.js";

export type Conflict = { type: string; message: string; conflicting_entry_id?: string };

export class ScheduleValidator {
  static async detectConflicts(entry: any): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    if (entry.teacher_id) {
      const r = await pool.query(
        `SELECT id FROM schedule_entries WHERE timetable_id=$1 AND teacher_id=$2 AND day_of_week=$3 AND time_slot_id=$4 AND id <> COALESCE($5, gen_random_uuid())`,
        [entry.timetable_id, entry.teacher_id, entry.day_of_week, entry.time_slot_id, entry.id ?? null]
      );
      if (r.rows.length) conflicts.push({ type:"teacher_double_booked", message:"Teacher already assigned", conflicting_entry_id:r.rows[0].id });
    }
    if (entry.room) {
      const r = await pool.query(
        `SELECT id FROM schedule_entries WHERE timetable_id=$1 AND room=$2 AND day_of_week=$3 AND time_slot_id=$4 AND id <> COALESCE($5, gen_random_uuid())`,
        [entry.timetable_id, entry.room, entry.day_of_week, entry.time_slot_id, entry.id ?? null]
      );
      if (r.rows.length) conflicts.push({ type:"room_occupied", message:"Room already occupied", conflicting_entry_id:r.rows[0].id });
    }
    const r = await pool.query(
      `SELECT id FROM schedule_entries WHERE timetable_id=$1 AND class_id=$2 AND day_of_week=$3 AND time_slot_id=$4 AND id <> COALESCE($5, gen_random_uuid())`,
      [entry.timetable_id, entry.class_id, entry.day_of_week, entry.time_slot_id, entry.id ?? null]
    );
    if (r.rows.length) conflicts.push({ type:"class_overlap", message:"Class already has a period", conflicting_entry_id:r.rows[0].id });
    return conflicts;
  }
}
