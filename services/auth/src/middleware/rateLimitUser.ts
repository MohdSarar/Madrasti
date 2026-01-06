import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { normalizeEmail } from "../utils/normalizeEmail.js";

function getIp(req: Request): string {
  // express-rate-limit already resolves IP, but we keep a stable fallback.
  return req.ip || (req.headers["x-forwarded-for"] as string) || "unknown";
}

function keyForLogin(req: Request): string {
  // Prefer normalized email (per-user), fallback to IP.
  const body = req.body as unknown;
  const email = normalizeEmail((body as { email?: unknown } | null)?.email);
  return email ? `email:${email}` : `ip:${getIp(req)}`;
}

function keyForAuthed(req: Request): string {
  // Prefer authenticated subject if present, fallback to IP.
  const auth = (req as unknown as { auth?: { sub?: string } }).auth;
  const sub = auth?.sub;
  return sub ? `user:${sub}` : `ip:${getIp(req)}`;
}

export const loginUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyForLogin,
  message: { ok: false, code: "RATE_LIMITED", message: "Too many login attempts" },
});

export const authUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyForAuthed,
  message: { ok: false, code: "RATE_LIMITED", message: "Too many requests" },
});
