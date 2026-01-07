import rateLimit from "express-rate-limit";
import { normalizeEmail } from "../utils/normalizeEmail.js";

function keyForLogin(req: any): string {
  // Prefer normalized email (per-user), fallback to IP.
  const email = normalizeEmail(req.body?.email);
  return email || String(req.ip || "unknown");
}

function keyForAuthed(req: any): string {
  // Prefer authenticated subject if present, fallback to IP.
  const sub = req.auth?.sub;
  return sub ? `u:${sub}` : String(req.ip || "unknown");
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
