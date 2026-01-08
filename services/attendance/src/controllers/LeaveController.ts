import type { Request, Response } from "express";
import { createLeaveSchema } from "../validation/leave.js";
import * as repo from "../repositories/LeaveRepository.js";

export async function list(req: Request, res: Response) {
  const schoolId = String(req.query.school_id ?? "");
  if (!schoolId) return res.status(400).json({ code: "VALIDATION_ERROR", message: "school_id is required" });
  const status = req.query.status ? String(req.query.status) : undefined;
  const rows = await repo.listLeaves(schoolId, status);
  res.json(rows);
}

export async function create(req: Request, res: Response) {
  const body = createLeaveSchema.parse(req.body);
  const row = await repo.createLeave(body);
  res.status(201).json(row);
}

export async function approve(req: Request, res: Response) {
  const reviewedBy = String(req.headers["x-user-id"] ?? "");
  if (!reviewedBy) return res.status(400).json({ code: "VALIDATION_ERROR", message: "x-user-id header required" });
  const row = await repo.setStatus(req.params.id!, "approved", reviewedBy, String(req.body?.comments ?? ""));
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "Leave request not found" });
  res.json(row);
}

export async function reject(req: Request, res: Response) {
  const reviewedBy = String(req.headers["x-user-id"] ?? "");
  if (!reviewedBy) return res.status(400).json({ code: "VALIDATION_ERROR", message: "x-user-id header required" });
  const row = await repo.setStatus(req.params.id!, "rejected", reviewedBy, String(req.body?.comments ?? ""));
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "Leave request not found" });
  res.json(row);
}
