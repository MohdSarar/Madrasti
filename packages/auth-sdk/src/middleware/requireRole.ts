import type { NextFunction, Response } from "express";
import type { AuthRequest, UserRole } from "../types/auth.js";

export function requireRole(options: { roles: UserRole[] }) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ code: "AUTH_MISSING", message: "Authentication required" });
    if (!options.roles.includes(req.auth.role)) {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: "Insufficient permissions",
        required_roles: options.roles,
        user_role: req.auth.role,
      });
    }
    return next();
  };
}
