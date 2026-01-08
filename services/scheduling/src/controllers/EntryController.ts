import type { Request, Response } from "express";
import { entrySchema } from "../validation/entries.js";
import { ScheduleValidator } from "../services/ScheduleValidator.js";
import * as repo from "../repositories/EntryRepository.js";

export async function create(req: Request, res: Response) {
  const body = entrySchema.parse(req.body);
  const conflicts = await ScheduleValidator.detectConflicts(body);
  if (conflicts.length) return res.status(409).json({ code:"SCHEDULE_CONFLICT", conflicts });
  const row = await repo.createEntry(body);
  res.status(201).json(row);
}

export async function list(req: Request, res: Response) {
  const timetableId = String(req.query.timetable_id ?? "");
  if (!timetableId) return res.status(400).json({ code:"VALIDATION_ERROR", message:"timetable_id is required" });
  const classId = req.query.class_id ? String(req.query.class_id) : undefined;
  const rows = await repo.listEntries(timetableId, classId);
  res.json(rows);
}

export async function remove(req: Request, res: Response) {
  await repo.deleteEntry(req.params.id!);
  res.status(204).end();
}
