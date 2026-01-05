import type { NextFunction, Request, Response } from "express";

import { httpRequestDurationMs } from "../metrics.js";

type RouteLike = { path?: unknown };

// Express' `Request` type defines `route` as `any`. Intersecting won't help
// because `any & T` becomes `any`, which then trips no-unsafe-* lint rules.
type ReqWithRoute = Omit<Request, "route"> & { route?: RouteLike };

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    // Express types keep `req.route` as `any`; narrow it safely for lint + strict TS.
    const route = (req as ReqWithRoute).route;
    const routePath = typeof route?.path === "string" ? route.path : undefined;

    httpRequestDurationMs
      .labels(req.method, routePath ?? req.path, String(res.statusCode))
      .observe(durationMs);
  });

  next();
}
