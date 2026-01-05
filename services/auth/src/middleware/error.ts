import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger.js";

type HttpishError = {
  status?: number;
  code?: string;
  message?: string;
  stack?: string;
};

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const e = err as any;
  const status = e?.status ?? 500;
  const code = e?.code ?? (status === 500 ? "INTERNAL" : "ERROR");
  const message = e?.message ?? "Unexpected error";

  // ensuite log pino (obj d'abord, msg ensuite)
  logger.error(
    { status, code, message, err: String(e?.stack ?? e) },
    "request failed"
  );


  res.status(status).json({ ok: false, code, message });
}
