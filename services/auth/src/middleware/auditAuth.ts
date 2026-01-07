import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger.js";

type AuditOutcome = "success" | "error";

function getHeaderString(req: Request, name: string): string | null {
  const v = req.headers[name.toLowerCase()];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? null;
  return null;
}

function getIp(req: Request): string {
  // Express sets req.ip; x-forwarded-for can be string or array
  return req.ip || getHeaderString(req, "x-forwarded-for") || "unknown";
}

function getTenantSlug(req: Request): string | null {
  return getHeaderString(req, "x-school-slug");
}

function getUserId(req: Request): string | null {
  const auth = (req as unknown as { auth?: { sub?: string } }).auth;
  return auth?.sub ?? null;
}

function extractErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: unknown; name?: unknown };
  if (typeof e.code === "string") return e.code;
  if (typeof e.name === "string") return e.name;
  return null;
}

function extractStatus(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { status?: unknown; statusCode?: unknown };
  if (typeof e.status === "number") return e.status;
  if (typeof e.statusCode === "number") return e.statusCode;
  return null;
}

/**
 * Audit logs for auth-sensitive routes.
 * - Does not log secrets (password/otp)
 * - Logs outcome + error code (for SOC-style audits later)
 */
export function auditAuth(action: string) {
  return function auditMiddleware(req: Request, res: Response, next: NextFunction) {
    const started = Date.now();
    const userAgent = getHeaderString(req, "user-agent");

    const log = (outcome: AuditOutcome, extra?: { error_code?: string | null; status?: number }) => {
      const durationMs = Date.now() - started;
      logger.info(
        {
          audit: true,
          action,
          outcome,
          status: extra?.status ?? res.statusCode,
          duration_ms: durationMs,
          method: req.method,
          path: req.path,
          user_id: getUserId(req),
          tenant_slug: getTenantSlug(req),
          ip: getIp(req),
          user_agent: userAgent,
          ...(extra?.error_code ? { error_code: extra.error_code } : {}),
        },
        outcome === "error" ? "audit_error" : "audit"
      );
    };

    // Always log when the response is completed
    res.on("finish", () => {
      const outcome: AuditOutcome = res.statusCode < 400 ? "success" : "error";
      log(outcome);
    });

    // Optional: if client disconnects early
    res.on("close", () => {
      if (!res.writableEnded) {
        log("error", { status: res.statusCode });
      }
    });

    return next();
  };
}

// If you also want to log error codes, do it in your global error middleware:
// there you HAVE access to `err`, safely, and you can call extractErrorCode(err).
export { extractErrorCode, extractStatus };
