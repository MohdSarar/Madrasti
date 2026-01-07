import type { Request, Response } from "express";
import { AccountLockoutService } from "../services/AccountLockoutService.js";
import { AuditService } from "../services/AuditService.js";

const lockouts = new AccountLockoutService();
const audit = new AuditService();

export async function getStatus(req: Request, res: Response) {
  const userId = req.params.userId;
  const schoolId = (req.query.school_id as string) ?? "";
  if (!schoolId) return res.status(400).json({ success:false, error:{ code:"VALIDATION", message:"school_id required" }});
  if (!userId) return res.status(400).json({ success:false, error:{ code:"VALIDATION", message:"userId required" }});
  const data = await lockouts.getStatus({ userId, schoolId });
  return res.json({ success:true, data });
}

export async function recordFailed(req: Request, res: Response) {
  const { userId, schoolId, reason } = req.body as { userId: string; schoolId: string; reason: string };
  const data = await lockouts.recordFailedAttempt({ userId, schoolId, reason });
  await audit.logEvent({
    event_type: "LOGIN_FAILED",
    event_source: "auth",
    user_id: userId,
    school_id: schoolId,
    action: "LOGIN",
    status: data.locked ? "BLOCKED" : "FAIL",
    details: { reason, ...data },
    severity: data.locked ? "HIGH" : "MEDIUM",
  });
  return res.status(201).json({ success:true, data });
}

export async function unlock(req: Request, res: Response) {
  const userId = req.params.userId;
  if (!userId) return res.status(400).json({ success:false, error:{ code:"VALIDATION", message:"userId required" }});
  const data = await lockouts.unlock({ userId });
  await audit.logEvent({
    event_type: "ACCOUNT_UNLOCKED",
    event_source: "security",
    user_id: userId,
    action: "UNLOCK",
    status: "SUCCESS",
    details: { unlockedAt: new Date().toISOString() },
    severity: "MEDIUM",
  });
  return res.json({ success:true, data });
}