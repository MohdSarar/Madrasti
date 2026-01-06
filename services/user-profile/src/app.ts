import express from "express";
import helmet from "helmet";
import cors from "cors";
import client from "prom-client";
import { authenticate, type AuthRequest } from "@madrasti/auth-sdk";
import { config } from "./config.js";
import { redis } from "./redis.js";
import { pool } from "./db.js";
import { logger } from "./logger.js";
import { httpRequestDuration, profilesUpdated } from "./metrics.js";
import { upsertProfileSchema } from "./validation/profile.js";
import * as profileRepo from "./repositories/profileRepo.js";

export function buildApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: config.maxBodyBytes }));

  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
    res.on("finish", () => end({ status: String(res.statusCode) } as any));
    next();
  });

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/readyz", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      await redis.ping();
      return res.json({ status: "ok" });
    } catch (e) {
      logger.error({ err: e }, "readyz failed");
      return res.status(503).json({ status: "unhealthy" });
    }
  });

  app.get("/metrics", async (_req, res) => {
    res.setHeader("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  });

  const auth = authenticate({
    authServiceUrl: config.authServiceUrl,
    serviceToken: config.authServiceToken,
    redis,
    cacheTTLSeconds: 60,
  });

  app.get("/api/v1/profile/me", auth, async (req: AuthRequest, res) => {
    const profile = await profileRepo.getProfile(req.auth!.sub);
    return res.json({ profile });
  });

  app.put("/api/v1/profile/me", auth, async (req: AuthRequest, res) => {
    const { value, error } = upsertProfileSchema.validate(req.body);
    if (error) return res.status(400).json({ code: "VALIDATION_ERROR", message: error.message });

    const row = await profileRepo.upsertProfile(req.auth!.sub, value);
    profilesUpdated.inc({ school_id: req.auth!.school_id ?? "none" });
    return res.json({ profile: row });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, "unhandled error");
    return res.status(500).json({ code: "INTERNAL_ERROR", message: "Internal server error" });
  });

  return app;
}
