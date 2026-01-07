import { Router } from "express";
import * as AuditController from "./controllers/AuditController.js";
import * as PasswordPolicyController from "./controllers/PasswordPolicyController.js";
import * as AccountLockoutController from "./controllers/AccountLockoutController.js";
import * as ComplianceController from "./controllers/ComplianceController.js";
import { requireServiceAuth } from "./middleware/serviceAuth.js";

export function buildRouter() {
  const r = Router();
  r.use("/api", requireServiceAuth);

  r.post("/api/v1/audit/events", AuditController.createEvent);
  r.get("/api/v1/audit/events", AuditController.listEvents);

  r.get("/api/v1/password-policies", PasswordPolicyController.listPolicies);
  r.post("/api/v1/password/validate", PasswordPolicyController.validatePassword);

  r.get("/api/v1/lockout/status/:userId", AccountLockoutController.getStatus);
  r.post("/api/v1/lockout/events", AccountLockoutController.recordFailed);
  r.post("/api/v1/lockout/unlock/:userId", AccountLockoutController.unlock);

  r.get("/api/v1/compliance/gdpr/status", ComplianceController.gdprStatus);
  r.post("/api/v1/compliance/gdpr/forget", ComplianceController.gdprForget);
  r.post("/api/v1/compliance/data/export", ComplianceController.exportUserData);

  return r;
}
