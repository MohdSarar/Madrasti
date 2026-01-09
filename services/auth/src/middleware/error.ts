import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger.js";

type AnyError = {
  status?: unknown;
  statusCode?: unknown;
  httpStatus?: unknown;
  code?: unknown;
  message?: unknown;
  stack?: unknown;
  name?: unknown;
};

function pickStatus(e: AnyError): number {
  const candidates = [e.status, e.statusCode, e.httpStatus];

  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c >= 400 && c <= 599) return c;
  }
  return 500;
}

function pickCode(e: AnyError, status: number): string {
  if (typeof e.code === "string" && e.code.length > 0 && e.code.length <= 64) return e.code;
  return status === 500 ? "INTERNAL" : "ERROR";
}

function pickMessage(e: AnyError, status: number): string {
  if (typeof e.message === "string" && e.message.length > 0) return e.message;
  return status === 500 ? "Unexpected error" : "Request rejected";
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const e = err as AnyError;
  void _next;
  const status = pickStatus(e);
  const code = pickCode(e, status);
  const message = pickMessage(e, status);

  // Log structuré (Pino)
  logger.error(
    {
      status,
      code,
      message,
      name: typeof e?.name === "string" ? e.name : undefined,
      stack: typeof e?.stack === "string" ? e.stack : undefined,
    },
    "request failed"
  );

  res.status(status).json({ ok: false, code, message });
}
