import type { Request, Response } from "express";
import { createGradeSchema, bulkGradesSchema } from "../validation/grades.js";
import { GradeCalculator } from "../services/GradeCalculator.js";
import * as repo from "../repositories/GradeRepository.js";
import { redis } from "../redis.js";

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
  // bust cached gpa
  if (redis.isOpen) {
    await redis.del(`gpa:${body.student_id}:*`).catch(() => undefined);
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
    saved.push(await repo.upsertGrade({
      school_id: body.school_id,
      assessment_id: body.assessment_id,
      student_id: g.student_id,
      marks_obtained: g.marks_obtained,
      marks_total: 100,
      percentage: pct,
      grade_letter: letter,
      grade_points: points,
      graded_by: String(req.headers["x-user-id"] ?? g.student_id),
    }));
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

// Minimal cached GPA: average grade_points
export async function gpa(req: Request, res: Response) {
  const studentId = req.params.studentId!;
  const periodId = req.query.period_id ? String(req.query.period_id) : "all";
  const key = `gpa:${studentId}:${periodId}`;
  if (!redis.isOpen) await redis.connect();
  const cached = await redis.get(key);
  if (cached) return res.json(JSON.parse(cached));
  const rows = await repo.listGradesByStudent(
    periodId === "all" ? { studentId } : { studentId, periodId }
  );
  const pts = rows.map((r: any) => Number(r.grade_points ?? 0));
  const gpa = pts.length ? Math.round((pts.reduce((a,b)=>a+b,0)/pts.length)*100)/100 : 0;
  const out = { gpa, cgpa: gpa };
  await redis.setEx(key, 3600, JSON.stringify(out));
  res.json(out);
}
