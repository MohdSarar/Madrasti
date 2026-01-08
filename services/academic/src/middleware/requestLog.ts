import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger.js";
import { httpRequestDuration } from "../metrics.js";

export function requestLog(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const seconds = Number(end - start) / 1e9;
    const route = (req.route && (req.baseUrl + req.route.path)) || req.path || "unknown";
    httpRequestDuration.labels(req.method, route, String(res.statusCode)).observe(seconds);
    logger.info({ method: req.method, path: req.originalUrl, status: res.statusCode, duration_s: seconds }, "http_request");
  });
  next();
}
