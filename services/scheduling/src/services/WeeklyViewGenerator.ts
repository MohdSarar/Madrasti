import { pool } from "../db.js";

export type WeeklyEntry = {
  period_name: string;
  start_time: string;
  end_time: string;
  subject: string | null;
  room: string | null;
  teacher_id: string | null;
};

export type WeeklySchedule = {
  monday: WeeklyEntry[];
  tuesday: WeeklyEntry[];
  wednesday: WeeklyEntry[];
  thursday: WeeklyEntry[];
  friday: WeeklyEntry[];
  saturday: WeeklyEntry[];
  sunday: WeeklyEntry[];
};

const dayMap: Record<number, keyof WeeklySchedule> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export class WeeklyViewGenerator {
  static async generateWeeklyView(
    entityType: "teacher" | "class" | "room",
    entityId: string,
    timetableId: string
  ): Promise<WeeklySchedule> {
    const r = await pool.query(
      `
      SELECT 
        se.*,
        ts.start_time,
        ts.end_time,
        ts.period_name,
        s.name_ar as subject_name
      FROM schedule_entries se
      JOIN time_slots ts ON se.time_slot_id = ts.id
      LEFT JOIN subjects s ON se.subject_id = s.id
      WHERE se.timetable_id = $1
        AND (
          ($2 = 'teacher' AND se.teacher_id::text = $3) OR
          ($2 = 'class' AND se.class_id::text = $3) OR
          ($2 = 'room' AND se.room = $3)
        )
      ORDER BY se.day_of_week, ts.start_time
      `,
      [timetableId, entityType, entityId]
    );

    const weekly: WeeklySchedule = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    for (const row of r.rows) {
      const dayOfWeek = Number(row.day_of_week);
      const day = dayMap[dayOfWeek];
      if (!day) continue;
      weekly[day].push({
        period_name: String(row.period_name),
        start_time: String(row.start_time),
        end_time: String(row.end_time),
        subject: row.subject_name ? String(row.subject_name) : null,
        room: row.room ? String(row.room) : null,
        teacher_id: row.teacher_id ? String(row.teacher_id) : null,
      });
    }

    return weekly;
  }

  static async checkTeacherAvailability(
    teacherId: string,
    timetableId: string,
    dayOfWeek: number,
    timeSlotId: string
  ): Promise<{ available: boolean; conflicting_entry_id?: string }> {
    const r = await pool.query(
      `
      SELECT id FROM schedule_entries
      WHERE timetable_id = $1
        AND teacher_id::text = $2
        AND day_of_week = $3
        AND time_slot_id::text = $4
      LIMIT 1
      `,
      [timetableId, teacherId, dayOfWeek, timeSlotId]
    );

    if (r.rows.length) {
      return { available: false, conflicting_entry_id: String(r.rows[0].id) };
    }
    return { available: true };
  }
}

