import express from "express";
import helmet from "helmet";
import cors from "cors";
import client from "prom-client";
import { authenticate, requireRole, type AuthRequest } from "@madrasti/auth-sdk";
import { bypassAuth } from "./middleware/bypassAuth.js";
import { EventBus } from "@madrasti/event-bus";
import { config } from "./config.js";
import { redis } from "./redis.js";
import { pool } from "./db.js";
import { logger } from "./logger.js";
import { httpRequestDuration, schoolsProvisioned } from "./metrics.js";
import { provisionSchoolSchema } from "./validation/schools.js";
import {
  createGradeLevelSchema,
  listGradeLevelsSchema,
  createClassSchema,
  listClassesSchema,
} from "./validation/academics.js";
import { SchoolProvisioningService } from "./services/provisioning.js";
import * as schoolRepo from "./repositories/schoolRepo.js";
import * as gradeLevelRepo from "./repositories/gradeLevelRepo.js";
import * as classRepo from "./repositories/classRepo.js";

function getRouteLabel(req: express.Request): string {
  // Prefer the matched route path (low-cardinality), fallback to raw path
  const routePath = (req.route?.path as string | undefined) ?? undefined;
  const baseUrl = req.baseUrl || "";
  if (routePath) return `${baseUrl}${routePath}`;
  return req.path || "unknown";
}

async function ensureRedisConnected(): Promise<void> {
  // node-redis v4 throws ClientClosedError if you call commands before connect()
  if (!redis.isOpen) {
    await redis.connect();
  }
  // If open but not ready, a ping may still fail on some setups; keep it simple:
  // ping will be the real readiness signal.
}

export function buildApp(eventBus: EventBus) {
  const app = express();
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: config.maxBodyBytes }));

  // Metrics: keep route label low-cardinality when possible
  app.use((req, res, next) => {
    const route = getRouteLabel(req);
    const end = httpRequestDuration.startTimer({ method: req.method, route });
    res.on("finish", () => {
      end({ status_code: String(res.statusCode) } as any);
    });
    next();
  });

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.get("/readyz", async (_req, res) => {
    try {
      await pool.query("SELECT 1");

      // IMPORTANT: must connect before using redis (otherwise ClientClosedError)
      await ensureRedisConnected();
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

  const auth = config.testBypassAuth
    ? bypassAuth()
    : authenticate({
        authServiceUrl: config.authServiceUrl,
        serviceToken: config.authServiceToken,
        redis,
        cacheTTLSeconds: 60,
      });

  const provisioning = new SchoolProvisioningService(eventBus);

  // Super-admin operations
  app.post(
    "/api/v1/schools/provision",
    auth,
    requireRole({ roles: ["super_admin"] }),
    async (req: AuthRequest, res) => {
      const { value, error } = provisionSchoolSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid payload",
          details: error.details,
        });
      }

      const result = await provisioning.provision(value);
      schoolsProvisioned.inc({ plan: value.subscription_plan ?? "basic" });
      return res.status(201).json(result);
    }
  );

  app.get("/api/v1/schools", auth, requireRole({ roles: ["super_admin"] }), async (_req, res) => {
    const rows = await schoolRepo.listSchools();
    return res.json({ items: rows });
  });

  // Academic structure (grade levels + classes)
  app.get("/api/v1/grade-levels", auth, requireRole({ roles: ["school_admin"] }), async (req: AuthRequest, res) => {
    const parsed = listGradeLevelsSchema.validate(req.query, { abortEarly: false });
    if (parsed.error) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid query",
        details: parsed.error.details,
      });
    }

    const schoolId = req.auth?.school_id;
    if (!schoolId) {
      return res.status(400).json({
        code: "TENANT_MISSING",
        message: "User has no tenant (school_id missing)",
      });
    }

    const items = await gradeLevelRepo.listGradeLevels({
      schoolId,
      academicYearId: parsed.value.academic_year_id || null,
    });

    return res.json({ items });
  });

  app.post("/api/v1/grade-levels", auth, requireRole({ roles: ["school_admin"] }), async (req: AuthRequest, res) => {
    const parsed = createGradeLevelSchema.validate(req.body, { abortEarly: false });
    if (parsed.error) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid payload",
        details: parsed.error.details,
      });
    }

    const schoolId = req.auth?.school_id;
    if (!schoolId) {
      return res.status(400).json({
        code: "TENANT_MISSING",
        message: "User has no tenant (school_id missing)",
      });
    }

    const row = await gradeLevelRepo.createGradeLevel({
      schoolId,
      academicYearId: parsed.value.academic_year_id || null,
      nameAr: parsed.value.name_ar,
      nameEn: parsed.value.name_en || null,
      code: parsed.value.code,
      levelOrder: parsed.value.level_order,
      section: parsed.value.section || null,
    });

    return res.status(201).json(row);
  });

  app.get("/api/v1/classes", auth, requireRole({ roles: ["school_admin"] }), async (req: AuthRequest, res) => {
    const parsed = listClassesSchema.validate(req.query, { abortEarly: false });
    if (parsed.error) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid query",
        details: parsed.error.details,
      });
    }

    const schoolId = req.auth?.school_id;
    if (!schoolId) {
      return res.status(400).json({
        code: "TENANT_MISSING",
        message: "User has no tenant (school_id missing)",
      });
    }

    const items = await classRepo.listClasses({
      schoolId,
      academicYearId: parsed.value.academic_year_id || null,
      gradeLevelId: parsed.value.grade_level_id || null,
    });

    return res.json({ items });
  });

  app.post("/api/v1/classes", auth, requireRole({ roles: ["school_admin"] }), async (req: AuthRequest, res) => {
    const parsed = createClassSchema.validate(req.body, { abortEarly: false });
    if (parsed.error) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid payload",
        details: parsed.error.details,
      });
    }

    const schoolId = req.auth?.school_id;
    if (!schoolId) {
      return res.status(400).json({
        code: "TENANT_MISSING",
        message: "User has no tenant (school_id missing)",
      });
    }

    const row = await classRepo.createClass({
      schoolId,
      academicYearId: parsed.value.academic_year_id || null,
      gradeLevelId: parsed.value.grade_level_id || null,
      nameAr: parsed.value.name_ar,
      nameEn: parsed.value.name_en || null,
      code: parsed.value.code,
      capacity: parsed.value.capacity,
      homeroomTeacherId: parsed.value.homeroom_teacher_id || null,
    });

    return res.status(201).json(row);
  });

  // 404
  app.use((_req, res) => {
    return res.status(404).json({ code: "NOT_FOUND", message: "Route not found" });
  });

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, "unhandled error");
    return res.status(500).json({ code: "INTERNAL_ERROR", message: "Internal server error" });
  });

  return app;
}
