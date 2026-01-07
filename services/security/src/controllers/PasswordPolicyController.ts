import type { Request, Response } from "express";
import { PasswordPolicyRepository } from "../repositories/PasswordPolicyRepository.js";
import { PasswordPolicyService, PasswordValidationError } from "../services/PasswordPolicyService.js";

const repo = new PasswordPolicyRepository();
const svc = new PasswordPolicyService();

export async function listPolicies(req: Request, res: Response) {
  const schoolId = req.query.school_id as string | undefined;
  const data = await repo.list(schoolId);
  return res.json({ success: true, data });
}

export async function validatePassword(req: Request, res: Response) {
  try {
    const body = req.body as { password?: string; schoolId?: string; userId?: string };

    if (!body.password || !body.schoolId) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION", message: "password and schoolId required" },
      });
    }

    const params: { password: string; schoolId: string; userId?: string } = {
      password: body.password,
      schoolId: body.schoolId,
    };
    if (body.userId) params.userId = body.userId;

    const data = await svc.validatePassword(params);
    return res.json({ success: true, data });
  } catch (e: any) {
    if (e instanceof PasswordValidationError) {
      return res.status(400).json({ success: false, error: { code: e.code, reasons: e.reasons } });
    }
    throw e;
  }
}
