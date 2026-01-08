import { Router } from "express";
import * as N from "./controllers/NotificationController.js";

export function buildRouter() {
  const r = Router();
  r.post("/api/v1/notifications/send", N.send);
  r.get("/api/v1/notifications/inbox", N.inbox);
  return r;
}
