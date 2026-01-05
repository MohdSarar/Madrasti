import express from "express";
import cors from "cors";
import helmet from "helmet";
import { buildRoutes } from "./routes.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import { errorMiddleware } from "./middleware/error.js";
import { config } from "./config.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { metricsMiddleware } from "./middleware/metrics.js";

export function buildApp() {
  const app = express();

  // IMPORTANT:
  // Never set `trust proxy = true` by default. It breaks IP-based rate limiting security.
  // In production behind a reverse proxy, set TRUST_PROXY=1 (or a safer value).
  app.set("trust proxy", config.trustProxy);
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);
  app.use(metricsMiddleware);

  app.use(requestLogger);
  app.use(metricsMiddleware);

  app.use(tenantMiddleware);

  app.use(buildRoutes());

  app.use(errorMiddleware);

  return app;
}
