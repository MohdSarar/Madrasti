import { HttpError } from "../utils/http.js";
import type { Request, Response, NextFunction } from "express";

export function requireStaff2fa(req: Request, _res: Response, next: NextFunction) {
  // suppose que requireAuth met user dans req.user
  const u: any = (req as any).user;
  if (!u) return next(new HttpError(401, "UNAUTHORIZED", "Not authenticated"));

  const isStaff = ["super_admin", "admin", "staff"].includes(u.role);
  if (!isStaff) return next();

  if (!u.twofaEnabled) return next(new HttpError(403, "TWO_FA_REQUIRED", "2FA required for staff"));
  return next();
}
