import { Router, type NextFunction, type Request, type Response } from "express";
import type Joi from "joi";
import swaggerUi from "swagger-ui-express";

import { asyncHandler } from "./utils/asyncHandler.js";
import { authRateLimit, loginRateLimit } from "./middleware/rateLimit.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import {
  schemaCreateSchool,
  schemaLogin,
  schemaRefresh,
  schema2faVerify,
  schemaPhoneRequestOtp,
  schemaPhoneVerifyOtp,
} from "./validation/schemas.js";
import * as authController from "./controllers/authController.js";
import * as superAdminController from "./controllers/superAdminController.js";
import { HttpError } from "./utils/http.js";
import { register } from "./metrics.js";
import { pool } from "./db.js";
import { getRedis } from "./services/otp.js";
import { buildOpenApiSpec } from "./openapi.js";



function validate<T>(schema: Joi.ObjectSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return next(new HttpError(400, "VALIDATION_ERROR", "Invalid payload", { details: error.details }));
    req.body = value;
    next();
  };
}

export function buildRoutes() {
  const r = Router();

  /**
   * @openapi
   * /health:
   *   get:
   *     summary: Liveness probe
   *     responses:
   *       200:
   *         description: OK
   */
  r.get("/health", asyncHandler(async (_req, res) => res.json({ ok: true })));
  r.get("/healthz", asyncHandler(async (_req, res) => res.json({ ok: true })));

  /**
   * @openapi
   * /readyz:
   *   get:
   *     summary: Readiness probe (Postgres + Redis)
   *     responses:
   *       200:
   *         description: OK
   */
  r.get(
    "/readyz",
    asyncHandler(async (_req, res) => {
      await pool.query("SELECT 1 as ok");
      const redis = await getRedis();
      const pong = await redis.ping();
      if (pong !== "PONG") throw new Error("Redis ping failed");
      res.json({ ok: true });
    })
  );

  /**
   * @openapi
   * /metrics:
   *   get:
   *     summary: Prometheus metrics
   *     responses:
   *       200:
   *         description: Prometheus text format
   */
  r.get(
    "/metrics",
    asyncHandler(async (_req, res) => {
      res.setHeader("Content-Type", register.contentType);
      res.send(await register.metrics());
    })
  );

  // OpenAPI + Swagger UI (nice-to-have)
  const spec = buildOpenApiSpec();
  r.get("/openapi.json", (_req, res) => res.json(spec));
  r.use("/docs", swaggerUi.serve as any, swaggerUi.setup(spec) as any);

  // Super admin
  r.post(
    "/v1/super-admin/schools",
    authRateLimit as any,
    requireAuth,
    requireRole(["super_admin"]),
    validate(schemaCreateSchool),
    superAdminController.createSchoolTenant
  );

  // Auth
  r.post("/v1/auth/login", loginRateLimit as any, validate(schemaLogin), authController.login);
  r.post("/v1/auth/refresh", authRateLimit as any, validate(schemaRefresh), authController.refresh);
  r.post("/v1/auth/logout", authRateLimit as any, authController.logout);

  // 2FA
  r.post("/v1/auth/2fa/setup", authRateLimit as any, requireAuth, authController.setup2fa);
  r.post("/v1/auth/2fa/verify", authRateLimit as any, requireAuth, validate(schema2faVerify), authController.verify2fa);

  // Phone OTP (dev)
  r.post("/v1/auth/phone/request-otp", authRateLimit as any, validate(schemaPhoneRequestOtp), authController.requestPhoneOtp);
  r.post("/v1/auth/phone/verify-otp", authRateLimit as any, validate(schemaPhoneVerifyOtp), authController.verifyPhoneOtp);

  return r;
}
