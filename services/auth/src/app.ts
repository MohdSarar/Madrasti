import express from "express";
import cors from "cors";
import helmet from "helmet";
import { buildRoutes } from "./routes.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import { errorMiddleware } from "./middleware/error.js";

export function buildApp() {
  const app = express();

  app.set("trust proxy", true);
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.use(tenantMiddleware);

  app.use(buildRoutes());

  app.use(errorMiddleware);

  return app;
}
