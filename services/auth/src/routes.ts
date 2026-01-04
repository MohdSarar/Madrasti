import { Router } from "express";
import { asyncHandler } from "./utils/asyncHandler.js";
import { authRateLimit, loginRateLimit } from "./middleware/rateLimit.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { schemaCreateSchool, schemaLogin, schemaRefresh, schema2faVerify, schemaPhoneRequestOtp, schemaPhoneVerifyOtp } from "./validation/schemas.js";
import * as authController from "./controllers/authController.js";
import * as superAdminController from "./controllers/superAdminController.js";
import { HttpError } from "./utils/http.js";

function validate(schema: any) {
  return (req: any, _res: any, next: any) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return next(new HttpError(400, "VALIDATION_ERROR", "Invalid payload", { details: error.details }));
    req.body = value;
    next();
  };
}

export function buildRoutes() {
  const r = Router();

  r.get("/healthz", asyncHandler(async (_req, res) => res.json({ ok: true })));

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
