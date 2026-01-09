/**
 * Step 2: Domain-driven auth errors.
 * - stable error codes for frontend SDK + metrics labels
 * - safe vs internal messages
 * - optional security-aware metadata
 */
export type AuthErrorCode =
  | "BAD_REQUEST"
  | "INVALID_CREDENTIALS"
  | "AUTH_MISSING"
  | "AUTH_INVALID"
  | "INVALID_TOKEN"
  | "REFRESH_INVALID"
  | "TENANT_MISSING"
  | "TENANT_UNKNOWN"
  | "TENANT_MISMATCH"
  | "DEVICE_LIMIT"
  | "TWO_FACTOR_REQUIRED"
  | "TWO_FACTOR_INVALID"
  | "TWO_FACTOR_NOT_SETUP"
  | "OTP_INVALID"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export interface AuthErrorMeta {
  // Keep meta safe to store (metrics/audit logs). Never put secrets here.
  reason?: string;
  tenantSlug?: string;
  userId?: number;
  sessionId?: number;
  ip?: string;
  userAgent?: string;
}

export interface CreateAuthErrorInput {
  code: AuthErrorCode;
  status: number;
  message: string; // internal message
  safeMessage: string; // safe user-facing message
  exposeMessage: boolean;
  meta?: AuthErrorMeta; // optional (must be omitted when undefined with exactOptionalPropertyTypes)
  cause?: unknown;
}

export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly status: number;
  public readonly safeMessage: string;
  public readonly exposeMessage: boolean;
  public readonly cause?: unknown;
  public readonly meta?: AuthErrorMeta;

  constructor(input: CreateAuthErrorInput) {
    super(input.message);
    this.name = "AuthError";
    this.code = input.code;
    this.status = input.status;
    this.safeMessage = input.safeMessage;
    this.exposeMessage = input.exposeMessage;
    this.cause = input.cause;
    if (input.meta !== undefined) this.meta = input.meta;
  }

  toPublicJson(): { code: AuthErrorCode; message: string } {
    return {
      code: this.code,
      message: this.exposeMessage ? this.safeMessage : "An error occurred",
    };
  }
}

// Factory helpers (domain-driven) – keep naming stable.
function create(input: CreateAuthErrorInput): AuthError {
  return new AuthError(input);
}

export const AuthErrors = {
  badRequest: (code: AuthErrorCode, message: string, meta?: AuthErrorMeta): AuthError =>
    create({
      code,
      status: 400,
      message,
      safeMessage: "Bad request",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  authMissing: (message = "Not authenticated", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "AUTH_MISSING",
      status: 401,
      message,
      safeMessage: "Not authenticated",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  invalidCredentials: (message = "Invalid credentials", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "INVALID_CREDENTIALS",
      status: 401,
      message,
      safeMessage: "Invalid credentials",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  invalidToken: (message = "Invalid token", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "INVALID_TOKEN",
      status: 401,
      message,
      safeMessage: "Invalid token",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  refreshInvalid: (message = "Invalid refresh token", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "REFRESH_INVALID",
      status: 401,
      message,
      safeMessage: "Invalid refresh token",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  tenantMissing: (message = "User has no school tenant", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "TENANT_MISSING",
      status: 400,
      message,
      safeMessage: "Tenant missing",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  tenantUnknown: (message = "Unknown school", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "TENANT_UNKNOWN",
      status: 400,
      message,
      safeMessage: "Unknown school",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  tenantMismatch: (message = "Tenant mismatch", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "TENANT_MISMATCH",
      status: 403,
      message,
      safeMessage: "Tenant mismatch",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  deviceLimit: (message = "Too many active devices", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "DEVICE_LIMIT",
      status: 429,
      message,
      safeMessage: "Too many active devices",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  twoFactorRequired: (message = "TOTP required", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "TWO_FACTOR_REQUIRED",
      status: 401,
      message,
      safeMessage: "TOTP required",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  twoFactorInvalid: (message = "Invalid TOTP", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "TWO_FACTOR_INVALID",
      status: 401,
      message,
      safeMessage: "Invalid TOTP",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  twoFactorNotSetup: (message = "2FA not setup", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "TWO_FACTOR_NOT_SETUP",
      status: 400,
      message,
      safeMessage: "2FA not setup",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  otpInvalid: (message = "Invalid OTP", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "OTP_INVALID",
      status: 401,
      message,
      safeMessage: "Invalid OTP",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  forbidden: (message = "Forbidden", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "FORBIDDEN",
      status: 403,
      message,
      safeMessage: "Forbidden",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  notFound: (message = "Not found", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "NOT_FOUND",
      status: 404,
      message,
      safeMessage: "Not found",
      exposeMessage: true,
      ...(meta !== undefined ? { meta } : {}),
    }),

  internal: (cause: unknown, message = "Internal error", meta?: AuthErrorMeta): AuthError =>
    create({
      code: "INTERNAL_ERROR",
      status: 500,
      message,
      safeMessage: "Internal error",
      exposeMessage: false,
      cause,
      ...(meta !== undefined ? { meta } : {}),
    }),
} as const;


// Backward-compatible alias
export const AuthErrorFactories = AuthErrors;
