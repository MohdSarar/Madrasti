import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/http.js";
import { logger } from "../logger.js";

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err?.status ?? 500;
  const code = err?.code ?? (status === 500 ? "INTERNAL" : "ERROR");
  const message = err?.message ?? "Unexpected error";

  if (status >= 500) {
    logger.error("request failed", { status, code, message, err: String(err?.stack ?? err) });
  }

  const body: any = { error: { code, message } };
  if (err instanceof HttpError && err.details) body.error.details = err.details;
  res.status(status).json(body);
}
