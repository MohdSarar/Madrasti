import type { Request, Response, NextFunction } from "express";
import { findSchoolBySlug } from "../repositories/schoolRepo.js";

declare module "express-serve-static-core" {
  interface Request {
    tenant?: { schoolId: string; slug: string };
  }
}

/**
 * Tenant resolution:
 * - For most endpoints, client provides `x-school-slug`.
 * - Super-admin endpoints do NOT require tenant.
 */
export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  const slug = req.header("x-school-slug");
  if (!slug) return next();

  const school = await findSchoolBySlug(slug);
  if (!school) {
    return next(Object.assign(new Error("Unknown school"), { status: 400, code: "TENANT_UNKNOWN" }));
  }
  req.tenant = { schoolId: school.id, slug: school.slug };
  next();
}
