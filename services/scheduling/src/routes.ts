import { Router } from "express";
import * as Entry from "./controllers/EntryController.js";

export function buildRouter() {
  const r = Router();
  r.get("/api/v1/schedule/entries", Entry.list);
  r.post("/api/v1/schedule/entries", Entry.create);
  r.delete("/api/v1/schedule/entries/:id", Entry.remove);
  return r;
}
