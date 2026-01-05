import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - start;
    logger.info({ method: req.method, path: req.path, status: res.statusCode, duration_ms: ms }, "request");
  });

  next();
}
