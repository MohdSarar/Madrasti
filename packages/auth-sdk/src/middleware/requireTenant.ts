import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../types/auth.js";

export function requireTenant(options: { allowSuperAdmin?: boolean } = {}) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ code: "AUTH_MISSING", message: "Authentication required" });
    if (options.allowSuperAdmin && req.auth.role === "super_admin") return next();
    if (!req.auth.school_id) return res.status(400).json({ code: "TENANT_MISSING", message: "User has no tenant" });
    return next();
  };
}
