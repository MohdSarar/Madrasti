import { Router } from "express";
import * as Report from "./controllers/ReportController.js";

export function buildRouter() {
  const r = Router();
  r.post("/api/v1/reports/generate", Report.generate);
  r.get("/api/v1/reports", Report.list);
  r.get("/api/v1/reports/:id", Report.get);
  return r;
}
