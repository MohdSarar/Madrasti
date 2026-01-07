import type { Request, Response } from "express";
import { ComplianceService } from "../services/ComplianceService.js";

const compliance = new ComplianceService();

export async function gdprStatus(_req: Request, res: Response) {
  return res.json({ success: true, data: { gdpr: "enabled", hipaa: "framework-ready" } });
}

export async function gdprForget(req: Request, res: Response) {
  const body = req.body as { userId?: string; schoolId?: string };
  const userId = body.userId;

  if (!userId) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION", message: "userId required" } });
  }

  const params: { userId: string; schoolId?: string } = { userId };
  if (body.schoolId) params.schoolId = body.schoolId;

  const data = await compliance.gdprForget(params);
  return res.json({ success: true, data });
}

export async function exportUserData(req: Request, res: Response) {
  const body = req.body as { userId?: string };
  const userId = body.userId;

  if (!userId) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION", message: "userId required" } });
  }

  const data = await compliance.exportUserData({ userId });
  return res.json({ success: true, data });
}
