import express from "express";
import helmet from "helmet";
import cors from "cors";
import { buildRouter } from "./routes.js";
import { metricsHandler } from "./metrics.js";
import { requestLog } from "./middleware/requestLog.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { dbHealth } from "./db.js";
import { redisHealth } from "./redis.js";

export function buildApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(requestLog);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/readyz", async (_req, res) => {
    const dbOk = await dbHealth().catch(() => false);
    const redisOk = await redisHealth().catch(() => false);
    const ok = dbOk && redisOk;
    res.status(ok ? 200 : 503).json({ ok, db: dbOk, redis: redisOk });
  });
  app.get("/metrics", metricsHandler);

  app.use(buildRouter());
  app.use(errorHandler);
  return app;
}
