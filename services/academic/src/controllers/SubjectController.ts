import type { Request, Response } from "express";
import { subjectCreateSchema, subjectUpdateSchema } from "../validation/subjects.js";
import * as repo from "../repositories/SubjectRepository.js";

export async function list(req: Request, res: Response) {
  const schoolId = String(req.query.school_id ?? "");
  if (!schoolId) return res.status(400).json({ code: "VALIDATION_ERROR", message: "school_id is required" });
  const gradeLevelId = req.query.grade_level_id ? String(req.query.grade_level_id) : undefined;
  const rows = await repo.listSubjects(
    gradeLevelId ? { schoolId, gradeLevelId } : { schoolId }
  );
  res.json(rows);
}

export async function get(req: Request, res: Response) {
  const row = await repo.getSubject(req.params.id!);
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "Subject not found" });
  res.json(row);
}

export async function create(req: Request, res: Response) {
  const body = subjectCreateSchema.parse(req.body);
  const row = await repo.createSubject(body);
  res.status(201).json(row);
}

export async function update(req: Request, res: Response) {
  const patch = subjectUpdateSchema.parse(req.body);
  const row = await repo.updateSubject(req.params.id!, patch);
  if (!row) return res.status(404).json({ code: "NOT_FOUND", message: "Subject not found" });
  res.json(row);
}

export async function remove(req: Request, res: Response) {
  await repo.deleteSubject(req.params.id!);
  res.status(204).end();
}