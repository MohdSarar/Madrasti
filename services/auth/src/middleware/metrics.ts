import type { NextFunction, Request, Response } from 'express';
import { httpRequestDurationMs } from '../metrics.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    const route = (req.route && req.route.path) ? String(req.route.path) : (req.path ?? 'unknown');
    httpRequestDurationMs
      .labels(req.method, route, String(res.statusCode))
      .observe(ms);
  });
  next();
}
