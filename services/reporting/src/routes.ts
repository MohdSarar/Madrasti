import { Router } from "express";
import * as ReportController from "./controllers/ReportController.js";

export function buildRouter() {
  const r = Router();

  r.post("/api/v1/reports/generate", ReportController.generate);
  r.post("/api/v1/reports/generate/batch", ReportController.generateBatch);

  r.get("/api/v1/reports", ReportController.list);
  r.get("/api/v1/reports/:id", ReportController.get);

  r.get("/api/v1/reports/:id/pdf", ReportController.downloadPDF);

  return r;
}
