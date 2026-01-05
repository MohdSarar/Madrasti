import { Router, type RequestHandler } from "express";
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
import { register as metricsRegister } from "./metrics.js";
import { pool } from "./db.js";
import { getRedis } from "./services/otp.js";
import { buildOpenApiSpec } from "./openapi.js";
function validate<T>(schema: Joi.ObjectSchema<T>): RequestHandler<Record<string, string>, unknown, T, Record<string, unknown>, Record<string, unknown>> {
  return (req, _res, next) => {
    // Joi's TS types are conservative and often surface `any`.
    // We keep the validation result typed to avoid unsafe destructuring/assignment warnings.
    const result: Joi.ValidationResult<T> = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (result.error) {
      return next(new HttpError(400, "VALIDATION_ERROR", "Invalid payload", { details: result.error.details }));
    }
    req.body = result.value;
    return next();
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
  r.get("/health", asyncHandler((_req, res) => {
    res.json({ ok: true });
    return Promise.resolve();
  }));
  r.get("/healthz", asyncHandler((_req, res) => {
    res.json({ ok: true });
    return Promise.resolve();
  }));
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
      res.setHeader("Content-Type", metricsRegister.contentType);
      res.send(await metricsRegister.metrics());
    })
  );
  // OpenAPI + Swagger UI (nice-to-have)
  const spec = buildOpenApiSpec();
  r.get("/openapi.json", (_req, res) => res.json(spec));
  r.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  // Super admin
  r.post(
    "/v1/super-admin/schools",
    authRateLimit,
    requireAuth,
    requireRole(["super_admin"]),
    validate(schemaCreateSchool),
    superAdminController.createSchoolTenant
  );
  // Auth
  r.post("/v1/auth/login", loginRateLimit, validate(schemaLogin), authController.login);
  r.post("/v1/auth/refresh", authRateLimit, validate(schemaRefresh), authController.refresh);
  r.post("/v1/auth/logout", authRateLimit, authController.logout);
  // 2FA
  r.post("/v1/auth/2fa/setup", authRateLimit, requireAuth, authController.setup2fa);
  r.post("/v1/auth/2fa/verify", authRateLimit, requireAuth, validate(schema2faVerify), authController.verify2fa);
  // Phone OTP (dev)
  r.post("/v1/auth/phone/request-otp", authRateLimit, validate(schemaPhoneRequestOtp), authController.requestPhoneOtp);
  r.post("/v1/auth/phone/verify-otp", authRateLimit, validate(schemaPhoneVerifyOtp), authController.verifyPhoneOtp);
  return r;
}