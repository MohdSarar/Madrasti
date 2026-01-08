import type { Request, Response } from "express";
import { generateReportSchema } from "../validation/reports.js";
import * as repo from "../repositories/ReportRepository.js";

export async function generate(req: Request, res: Response) {
  const body = generateReportSchema.parse(req.body);
  // Minimal: store payload as report data. Real impl should gather from other services.
  const data = {
    student_id: body.student_id,
    academic_period_id: body.academic_period_id,
    report_type: body.report_type,
    generated_at: new Date().toISOString(),
    note: "MVP placeholder report data (Step4).",
  };
  const row = await repo.saveReport({ ...body, data });
  res.status(201).json(row);
}

export async function get(req: Request, res: Response) {
  const row = await repo.getReport(req.params.id!);
  if (!row) return res.status(404).json({ code:"NOT_FOUND", message:"Report not found" });
  res.json(row);
}

export async function list(req: Request, res: Response) {
  const schoolId = String(req.query.school_id ?? "");
  if (!schoolId) return res.status(400).json({ code:"VALIDATION_ERROR", message:"school_id is required" });
  const studentId = req.query.student_id ? String(req.query.student_id) : undefined;
  const rows = await repo.listReports(schoolId, studentId);
  res.json(rows);
}