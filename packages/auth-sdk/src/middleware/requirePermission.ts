import type { NextFunction, Response } from "express";
import type { AuthRequest, Permission } from "../types/auth.js";

export function requirePermission(options: { permissions: Permission[]; mode?: "any" | "all" }) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ code: "AUTH_MISSING", message: "Authentication required" });
    const userPerms = req.auth.permissions ?? [];
    if (userPerms.includes("*")) return next();
    const mode = options.mode ?? "all";
    const ok = mode === "any" ? options.permissions.some((p) => userPerms.includes(p)) : options.permissions.every((p) => userPerms.includes(p));
    if (!ok) return res.status(403).json({ code: "FORBIDDEN", message: "Insufficient permissions", required: options.permissions, user_permissions: userPerms });
    return next();
  };
}
