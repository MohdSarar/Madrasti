import type { RequestHandler } from "express";
import { verifyAccessToken } from "../services/jwt.js";
import { HttpError } from "../utils/http.js";
import type { UserRole } from "../domain/roles.js";

/**
 * Parse and verify the access token, then attach `req.auth`.
 *
 * NOTE: we type this as `RequestHandler` to satisfy Express' router overloads
 * (avoids accidentally picking up the DOM `Request` type in TS).
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "AUTH_MISSING", "Missing Authorization Bearer token"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const claims = verifyAccessToken(token);

    // Optional tenant/school isolation (if tenant middleware populated it)
    if (req.tenant?.schoolId && claims.school_id && req.tenant.schoolId !== claims.school_id) {
      return next(new HttpError(403, "TENANT_MISMATCH", "Tenant mismatch"));
    }

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
};

export function requireRole(roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(new HttpError(401, "AUTH_MISSING", "Not authenticated"));
    if (!roles.includes(req.auth.role)) return next(new HttpError(403, "FORBIDDEN", "Insufficient role"));
    next();
  };
}

export function require2faIfNeeded(): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(new HttpError(401, "AUTH_MISSING", "Not authenticated"));
    // For endpoints that need "strong" auth, require twoFactor true
    if (!req.auth.twoFactor) return next(new HttpError(401, "TWO_FACTOR_REQUIRED", "2FA required"));
    next();
  };
}
