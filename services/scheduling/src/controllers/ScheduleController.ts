import type { Request, Response } from "express";
import { z } from "zod";
import { WeeklyViewGenerator } from "../services/WeeklyViewGenerator.js";

export async function getWeeklyView(req: Request, res: Response) {
  const { entityType, entityId } = req.params;
  const timetableId = String(req.query.timetable_id ?? "");
  
  if (!timetableId) return res.status(400).json({ code: "VALIDATION_ERROR", message: "timetable_id query param required" });
  if (!entityType || !entityId) return res.status(400).json({ code: "VALIDATION_ERROR", message: "entityType and entityId required" });
  if (!["teacher", "class", "room"].includes(entityType)) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "entityType must be teacher|class|room" });
  }

  const weekly = await WeeklyViewGenerator.generateWeeklyView(
    entityType as "teacher" | "class" | "room",
    entityId,
    timetableId
  );
  res.json(weekly);
}

const availabilitySchema = z.object({
  teacher_id: z.string().uuid(),
  timetable_id: z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6),
  time_slot_id: z.string().uuid(),
});

export async function checkAvailability(req: Request, res: Response) {
  const body = availabilitySchema.parse(req.body);
  const result = await WeeklyViewGenerator.checkTeacherAvailability(
    body.teacher_id,
    body.timetable_id,
    body.day_of_week,
    body.time_slot_id
  );
  res.json(result);
}
