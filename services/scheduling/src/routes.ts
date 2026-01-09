import { Router } from "express";
import * as Entry from "./controllers/EntryController.js";
import * as ScheduleController from "./controllers/ScheduleController.js";

export function buildRouter() {
  const r = Router();

  // CRUD entries
  r.get("/api/v1/schedule/entries", Entry.list);
  r.post("/api/v1/schedule/entries", Entry.create);
  r.delete("/api/v1/schedule/entries/:id", Entry.remove);

  // Polish APIs (weekly view + availability)
  r.get("/api/v1/schedule/weekly/:entityType/:entityId", ScheduleController.getWeeklyView);
  r.post("/api/v1/schedule/check-availability", ScheduleController.checkAvailability);

  return r;
}
