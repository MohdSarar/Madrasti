import type { Request, Response } from "express";
import * as ReportRepository from "../repositories/ReportRepository.js";
import { ReportCardGenerator } from "../services/ReportCardGenerator.js";
import { PDFGenerator } from "../services/PDFGenerator.js";
import { v4 as uuid } from "uuid";

export async function generate(req: Request, res: Response) {
  const { school_id, student_id, academic_period_id, report_type, generated_by } = req.body;

  if (!school_id || !student_id || !academic_period_id || !report_type || !generated_by) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Missing required fields"
    });
  }

  const report = await ReportRepository.createReport({
    school_id,
    student_id,
    academic_period_id,
    report_type,
    generated_by,
  });

  res.status(201).json(report);
}

export async function get(req: Request, res: Response) {
  const reportId = req.params.id;

  if (!reportId) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Report ID required"
    });
  }

  const report = await ReportRepository.getReport(reportId);

  if (!report) {
    return res.status(404).json({
      code: "NOT_FOUND",
      message: "Report not found"
    });
  }

  res.json(report);
}

export async function list(req: Request, res: Response) {
  const schoolId = String(req.query.school_id ?? "");
  const studentId = req.query.student_id ? String(req.query.student_id) : undefined;

  if (!schoolId) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "school_id query parameter required"
    });
  }

  const reports = await ReportRepository.listReports(schoolId, studentId);
  res.json(reports);
}

export async function downloadPDF(req: Request, res: Response) {
  const reportId = req.params.id;

  if (!reportId) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Report ID required"
    });
  }

  const report = await ReportRepository.getReport(reportId);
  if (!report) {
    return res.status(404).json({
      code: "NOT_FOUND",
      message: "Report not found"
    });
  }

  try {
    const reportData = await ReportCardGenerator.generate(reportId);
    const pdfBuffer = await PDFGenerator.generatePDF(reportData);

    await ReportRepository.updateStatus(reportId, "completed");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report-" + reportId + ".pdf");
    res.send(pdfBuffer);
  } catch (error: any) {
    await ReportRepository.updateStatus(reportId, "failed", error.message);
    res.status(500).json({
      code: "PDF_GENERATION_ERROR",
      message: "Failed to generate PDF"
    });
  }
}

export async function generateBatch(req: Request, res: Response) {
  const { student_ids, academic_period_id, school_id, generated_by } = req.body;

  if (!student_ids || !academic_period_id || !school_id || !generated_by) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Missing required fields"
    });
  }

  const jobId = uuid();
  const jobs = [];

  for (const studentId of student_ids) {
    const report = await ReportRepository.createReport({
      school_id,
      student_id: studentId,
      academic_period_id,
      report_type: "report_card",
      generated_by,
    });

    jobs.push({
      report_id: report.id,
      student_id: studentId,
    });
  }

  res.status(202).json({
    job_id: jobId,
    total_reports: jobs.length,
    status: "processing",
    message: "Batch report generation started"
  });
}
