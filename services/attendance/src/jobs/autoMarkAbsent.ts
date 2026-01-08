import { pool } from "../db.js";
import { eventBus } from "../eventBus.js";
import { logger } from "../logger.js";

type StudentRow = {
  id: string;
  school_id: string;
  current_class_id: string | null;
  full_name_ar: string;
};

/**
 * Auto-mark absent for students not marked by the cut-off time.
 * Should run daily via cron job.
 */
export async function autoMarkAbsent(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay();

  logger.info({ date: today }, "auto_mark_absent_start");

  // 1) Get all active students
  const studentsResult = await pool.query<StudentRow>(
    `
    SELECT s.id, s.school_id, s.current_class_id, s.full_name_ar
    FROM students s
    WHERE s.is_active = true
      AND s.enrollment_status = 'active'
    `
  );

  const students = studentsResult.rows;
  logger.info({ count: students.length }, "auto_mark_absent_students_found");

  if (!students.length) return;

  // 2) Students already marked today
  const markedResult = await pool.query<{ student_id: string }>(
    `
    SELECT DISTINCT student_id
    FROM attendance_records
    WHERE attendance_date = $1
    `,
    [today]
  );
  const markedStudentIds = new Set(markedResult.rows.map((r) => r.student_id));

  // 3) Unmarked students
  const unmarked = students.filter((s) => !markedStudentIds.has(s.id));

  if (!unmarked.length) {
    logger.info("auto_mark_absent_all_students_already_marked");
    return;
  }

  logger.warn({ count: unmarked.length }, "auto_mark_absent_marking");

  // 4) Bulk insert absent records
  const values = unmarked
    .map((_, idx) => {
      const offset = idx * 7;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
    })
    .join(",");

  const params = unmarked.flatMap((s) => [
    s.id,
    s.school_id,
    s.current_class_id,
    today,
    dayOfWeek,
    "absent",
    "SYSTEM",
  ]);

  await pool.query(
    `
    INSERT INTO attendance_records (
      student_id, school_id, class_id, attendance_date,
      day_of_week, status, marked_by, marked_at
    )
    VALUES ${values}
    `,
    params
  );

  // 5) Publish events for each absent student
  for (const student of unmarked) {
    await eventBus.publish("attendance-events", {
      type: "student.absent",
      payload: {
        student_id: student.id,
        student_name: student.full_name_ar,
        school_id: student.school_id,
        date: today,
        auto_marked: true,
      },
      timestamp: Date.now(),
    });
  }

  // 6) Update attendance summaries
  await updateAttendanceSummaries(unmarked.map((s) => s.id));

  logger.info({ marked: unmarked.length }, "auto_mark_absent_done");
}

async function updateAttendanceSummaries(studentIds: string[]): Promise<void> {
  for (const studentId of studentIds) {
    const periodResult = await pool.query<{ id: string }>(
      `
      SELECT ap.id
      FROM academic_periods ap
      WHERE ap.start_date <= CURRENT_DATE
        AND ap.end_date >= CURRENT_DATE
      ORDER BY ap.start_date DESC
      LIMIT 1
      `
    );

    if (!periodResult.rows.length) continue;
    const pRow = periodResult.rows[0]; if (!pRow) continue; const periodId = pRow.id;

    const summaryResult = await pool.query<{
      total_days: string;
      present_days: string;
      absent_days: string;
      tardy_days: string;
      excused_days: string;
    }>(
      `
      SELECT
        COUNT(*) as total_days,
        COUNT(*) FILTER (WHERE status = 'present') as present_days,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
        COUNT(*) FILTER (WHERE status = 'tardy') as tardy_days,
        COUNT(*) FILTER (WHERE status = 'excused') as excused_days
      FROM attendance_records
      WHERE student_id = $1
        AND attendance_date >= (SELECT start_date FROM academic_periods WHERE id = $2)
        AND attendance_date <= CURRENT_DATE
      `,
      [studentId, periodId]
    );

    const s = summaryResult.rows[0]; if (!s) continue;
    const total = Number(s.total_days || 0);
    const present = Number(s?.present_days ?? 0);
    const excused = Number(s?.excused_days ?? 0);

    const rate = total > 0 ? ((present + excused) / total) * 100 : 0;

    await pool.query(
      `
      INSERT INTO attendance_summary (
        student_id, academic_period_id, total_days, present_days,
        absent_days, tardy_days, excused_days, attendance_rate, last_updated
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (student_id, academic_period_id)
      DO UPDATE SET
        total_days = EXCLUDED.total_days,
        present_days = EXCLUDED.present_days,
        absent_days = EXCLUDED.absent_days,
        tardy_days = EXCLUDED.tardy_days,
        excused_days = EXCLUDED.excused_days,
        attendance_rate = EXCLUDED.attendance_rate,
        last_updated = NOW()
      `,
      [
        studentId,
        periodId,
        total,
        Number(s?.present_days ?? 0),
        Number(s?.absent_days ?? 0),
        Number(s?.tardy_days ?? 0),
        Number(s?.excused_days ?? 0),
        Math.round(rate * 100) / 100,
      ]
    );
  }
}
