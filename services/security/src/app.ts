import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./logger.js";
import { buildRouter } from "./routes.js";
import { metricsText } from "./metrics.js";
import { dbHealthcheck } from "./db.js";

export function buildApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "256kb" }));

  // pino-http ESM/CJS safe call (TS strict friendly)
  const http = ((pinoHttp as unknown as any).default ?? (pinoHttp as unknown as any))({ logger });
  app.use(http);

  app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));
  app.get("/readyz", async (_req: Request, res: Response) => {
    try { await dbHealthcheck(); return res.json({ ok: true }); }
    catch (e: any) { return res.status(503).json({ ok: false, error: e?.message ?? "not ready" }); }
  });

  app.get("/metrics", async (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.send(await metricsText());
  });

  app.use(buildRouter());

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "unhandled_error");
    res.status(500).json({ success: false, error: { code: "INTERNAL", message: "Internal error" } });
  });

  return app;
}
