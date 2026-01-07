import type { NextFunction, Request, Response } from "express";

import { isStaffRole } from "../domain/roles.js";
import { AuthErrors } from "../errors/AuthError.js";

type AuthUser = { role: string; twofaEnabled?: boolean };

export function requireStaff2fa(req: Request, _res: Response, next: NextFunction): void {
  const auth = (req as Request & { auth?: AuthUser }).auth;
  if (!auth) return next(AuthErrors.authMissing("Not authenticated"));

  if (isStaffRole(auth.role) && !auth.twofaEnabled) {
    return next(AuthErrors.twoFactorRequired("TOTP required", { reason: "staff_requires_2fa" }));
  }

  return next();
}
