import express from "express";
import helmet from "helmet";
import cors from "cors";
import client from "prom-client";
import {
  authenticate,
  requireRole,
  requireTenant,
  type AuthRequest,
} from "@madrasti/auth-sdk";
import { config } from "./config.js";
import { redis } from "./redis.js";
import { pool } from "./db.js";
import { logger } from "./logger.js";
import { httpRequestDuration, studentsCreated } from "./metrics.js";
import {
  createStudentSchema,
  listStudentsSchema,
} from "./validation/students.js";
import * as studentRepo from "./repositories/studentRepo.js";

function requireAuthContext(req: AuthRequest, res: express.Response): {
  schoolId: string;
  userId: string;
} | null {
  if (!req.auth) {
    res
      .status(401)
      .json({ code: "AUTH_MISSING", message: "Authentication required" });
    return null;
  }

  const schoolId = req.auth.school_id;
  if (!schoolId) {
    res.status(400).json({
      code: "TENANT_MISSING",
      message: "User has no tenant (school_id missing)",
    });
    return null;
  }

  const userId = req.auth.sub;
  if (!userId) {
    res
      .status(401)
      .json({ code: "AUTH_MISSING", message: "Authentication required" });
    return null;
  }

  return { schoolId, userId };
}

export function buildApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: config.maxBodyBytes }));

  // Metrics middleware
  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer({
      method: req.method,
      route: req.path,
    });

    res.on("finish", () => {
      end({ status: String(res.statusCode) } as never);
    });

    next();
  });

  // Health
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

  // Auth middleware (service-to-service validate)
  const auth = authenticate({
    authServiceUrl: config.authServiceUrl,
    serviceToken: config.authServiceToken,
    redis,
    cacheTTLSeconds: 60,
  });

  // API
  app.get(
    "/api/v1/students",
    auth,
    requireRole({ roles: ["school_admin", "teacher"] }),
    requireTenant(),
    async (req: AuthRequest, res) => {
      const parsed = listStudentsSchema.validate(req.query);
      if (parsed.error) {
        return res
          .status(400)
          .json({ code: "VALIDATION_ERROR", message: parsed.error.message });
      }

      const ctx = requireAuthContext(req, res);
      if (!ctx) return;

      const { rows, total } = await studentRepo.listStudents({
        schoolId: ctx.schoolId,
        search: parsed.value.search,
        page: parsed.value.page,
        limit: parsed.value.limit,
      });

      return res.json({ items: rows, total });
    }
  );

  app.post(
    "/api/v1/students",
    auth,
    requireRole({ roles: ["school_admin"] }),
    requireTenant(),
    async (req: AuthRequest, res) => {
      const parsed = createStudentSchema.validate(req.body);
      if (parsed.error) {
        return res
          .status(400)
          .json({ code: "VALIDATION_ERROR", message: parsed.error.message });
      }

      const ctx = requireAuthContext(req, res);
      if (!ctx) return;

      const student = await studentRepo.createStudent({
        schoolId: ctx.schoolId,
        studentCode: parsed.value.student_code,
        firstNameAr: parsed.value.first_name_ar,
        lastNameAr: parsed.value.last_name_ar,
        dateOfBirth: parsed.value.date_of_birth,
        gender: parsed.value.gender,
        enrollmentDate: parsed.value.enrollment_date,
        createdBy: ctx.userId,
      });

      // Avoid "string | undefined" by using ctx.schoolId (string guaranteed)
      studentsCreated.inc({ school_id: ctx.schoolId });

      return res.status(201).json(student);
    }
  );

  app.get(
    "/api/v1/students/:id",
    auth,
    requireRole({ roles: ["school_admin", "teacher"] }),
    requireTenant(),
    async (req: AuthRequest, res) => {
      const ctx = requireAuthContext(req, res);
      if (!ctx) return;

      const studentId = req.params["id"]; // string | undefined
      if (!studentId) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Student id is required",
        });
      }

      const student = await studentRepo.findStudentById(studentId, ctx.schoolId);

      if (!student) {
        return res
          .status(404)
          .json({ code: "NOT_FOUND", message: "Student not found" });
      }

      return res.json(student);
    }
  );

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logger.error({ err }, "unhandled error");
      return res
        .status(500)
        .json({ code: "INTERNAL_ERROR", message: "Internal server error" });
    }
  );

  return app;
}
