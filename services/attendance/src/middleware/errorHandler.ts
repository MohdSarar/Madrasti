import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../logger.js";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Invalid request", details: err.flatten() });
  }
  const status = Number(err?.status ?? 500);
  const code = err?.code ?? "INTERNAL_ERROR";
  const message = err?.message ?? "Internal error";
  logger.error({ err, status, code }, "request_error");
  res.status(status).json({ code, message });
}
