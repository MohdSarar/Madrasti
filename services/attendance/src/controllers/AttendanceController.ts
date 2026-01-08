import type { Request, Response } from "express";
import { markClassSchema } from "../validation/attendance.js";
import * as repo from "../repositories/AttendanceRepository.js";

export async function markClass(req: Request, res: Response) {
  const body = markClassSchema.parse(req.body);
  const day = new Date(body.attendance_date).getDay();
  const rows = [];
  for (const r of body.records) {
    rows.push(await repo.upsertAttendance({
      school_id: body.school_id,
      student_id: r.student_id,
      class_id: body.class_id,
      academic_period_id: body.academic_period_id,
      attendance_date: body.attendance_date,
      day_of_week: day,
      status: r.status,
      late_minutes: r.late_minutes,
      remarks: r.remarks,
      marked_by: body.marked_by,
    }));
  }
  res.status(201).json({ count: rows.length, rows });
}

export async function byDate(req: Request, res: Response) {
  const schoolId = String(req.query.school_id ?? "");
  if (!schoolId) return res.status(400).json({ code: "VALIDATION_ERROR", message: "school_id is required" });
  const date = req.params.date!;
  const classId = req.params.classId ? String(req.params.classId) : undefined;
  const rows = await repo.listByDate(schoolId, date, classId);
  res.json(rows);
}

export async function byStudent(req: Request, res: Response) {
  const rows = await repo.listByStudent(req.params.studentId!);
  res.json(rows);
}
