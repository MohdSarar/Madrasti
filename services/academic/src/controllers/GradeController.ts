import type { Request, Response } from "express";
import { createGradeSchema, bulkGradesSchema } from "../validation/grades.js";
import { GradeCalculator } from "../services/GradeCalculator.js";
import { GPACalculator } from "../services/GPACalculator.js";
import * as repo from "../repositories/GradeRepository.js";
import { redis } from "../redis.js";
import { pool } from "../db.js";
import { eventBus } from "../eventBus.js";

export async function create(req: Request, res: Response) {
  const body = createGradeSchema.parse(req.body);
  const pct = GradeCalculator.calculatePercentage(body.marks_obtained, body.marks_total);
  const letter = GradeCalculator.calculateLetterGrade(pct);
  const points = GradeCalculator.calculateGradePoints(letter);
  const saved = await repo.upsertGrade({
    ...body,
    percentage: pct,
    grade_letter: letter,
    grade_points: points,
    graded_by: String(req.headers["x-user-id"] ?? body.student_id),
  });

  // Invalidate GPA cache for this student's period (exact)
  try {
    const a = await pool.query<{ academic_period_id: string; subject_id: string; marks_total: number }>(
      "SELECT academic_period_id, subject_id, marks_total FROM assessments WHERE id = $1",
      [body.assessment_id]
    );
    const periodId = a.rows[0]?.academic_period_id;
    if (periodId) {
      await GPACalculator.invalidateCache(body.student_id, periodId);
    }

    // Publish event for downstream services (notifications, reporting, etc.)
    await eventBus.publish("academic-events", {
      type: "grade.updated",
      payload: {
        grade_id: saved.id,
        student_id: saved.student_id,
        assessment_id: saved.assessment_id,
        marks_obtained: saved.marks_obtained,
        marks_total: a.rows[0]?.marks_total ?? body.marks_total,
        percentage: saved.percentage,
        subject_id: a.rows[0]?.subject_id,
        school_id: saved.school_id,
      },
      timestamp: Date.now(),
      correlation_id: String(req.headers["x-correlation-id"] ?? ""),
    });
  } catch {
    // best-effort only
  }

  // Keep legacy broad cache bust as fallback
  if (redis.isOpen) {
    await redis.del(`gpa:${body.student_id}:all`).catch(() => undefined);
  }
  res.status(201).json(saved);
}

export async function bulk(req: Request, res: Response) {
  const body = bulkGradesSchema.parse(req.body);
  const saved = [];
  for (const g of body.grades) {
    const pct = GradeCalculator.calculatePercentage(g.marks_obtained, 100);
    const letter = GradeCalculator.calculateLetterGrade(pct);
    const points = GradeCalculator.calculateGradePoints(letter);
    const upserted = await repo.upsertGrade({
      school_id: body.school_id,
      assessment_id: body.assessment_id,
      student_id: g.student_id,
      marks_obtained: g.marks_obtained,
      marks_total: 100,
      percentage: pct,
      grade_letter: letter,
      grade_points: points,
      graded_by: String(req.headers["x-user-id"] ?? g.student_id),
    });
    saved.push(upserted);

    // Best-effort cache invalidation for each grade
    try {
      const a = await pool.query<{ academic_period_id: string }>(
        "SELECT academic_period_id FROM assessments WHERE id = $1",
        [body.assessment_id]
      );
      const periodId = a.rows[0]?.academic_period_id;
      if (periodId) {
        await GPACalculator.invalidateCache(g.student_id, periodId);
      }
    } catch {
      // ignore
    }

    // Publish academic event (best-effort)
    try {
      await eventBus.publish("academic-events", {
        type: "grade.updated",
        payload: {
          grade_id: upserted.id,
          student_id: upserted.student_id,
          assessment_id: upserted.assessment_id,
          marks_obtained: upserted.marks_obtained,
          percentage: upserted.percentage,
          school_id: upserted.school_id,
        },
        timestamp: Date.now(),
        correlation_id: String(req.headers["x-correlation-id"] ?? ""),
      });
    } catch {
      // ignore
    }
  }
  res.status(201).json({ count: saved.length, rows: saved });
}

export async function byStudent(req: Request, res: Response) {
  const studentId = req.params.studentId!;
  const periodId = req.query.period_id ? String(req.query.period_id) : undefined;
  const rows = await repo.listGradesByStudent(
    periodId ? { studentId, periodId } : { studentId }
  );
  res.json(rows);
}

// Enterprise GPA (period required)
export async function getStudentGPA(req: Request, res: Response) {
  const { studentId, periodId } = req.params as { studentId: string; periodId: string };

  try {
    const out = await GPACalculator.calculateGPA(studentId, periodId);
    res.json(out);
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const err = error as any;
    res.status(500).json({
      code: "GPA_CALCULATION_ERROR",
      message: "Failed to calculate GPA",
      details: err?.message,
    });
  }
}

// Backward-compatible endpoint: /grades/student/:studentId/gpa?period_id=...
export async function gpa(req: Request, res: Response) {
  const studentId = req.params.studentId!;
  const periodId = req.query.period_id ? String(req.query.period_id) : "";
  if (!periodId) {
    return res.status(400).json({ code: "PERIOD_REQUIRED", message: "period_id query param is required" });
  }
  req.params = { ...req.params, periodId } as any;
  return getStudentGPA(req, res);
}
