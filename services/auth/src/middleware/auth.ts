import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/jwt.js";
import { HttpError } from "../utils/http.js";
import type { UserRole } from "../domain/roles.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      userId: string;
      schoolId: string | null;
      role: UserRole;
      twoFactor: boolean;
    };
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "AUTH_MISSING", "Missing Authorization Bearer token"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const claims = verifyAccessToken(token);
    req.auth = {
      userId: claims.sub,
      schoolId: claims.school_id ?? null,
      role: claims.role,
      twoFactor: Boolean(claims.two_factor),
    };
    return next();
  } catch {
    return next(new HttpError(401, "AUTH_INVALID", "Invalid or expired token"));
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError(401, "AUTH_MISSING", "Not authenticated"));
    if (!roles.includes(req.auth.role)) return next(new HttpError(403, "FORBIDDEN", "Insufficient role"));
    next();
  };
}

export function require2faIfNeeded() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new HttpError(401, "AUTH_MISSING", "Not authenticated"));
    // For endpoints that need "strong" auth, require twoFactor true
    if (!req.auth.twoFactor) return next(new HttpError(401, "TWO_FACTOR_REQUIRED", "2FA required"));
    next();
  };
}
