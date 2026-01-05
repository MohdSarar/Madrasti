export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "AUTH_INVALID"
  | "TENANT_UNKNOWN"
  | "TENANT_REQUIRED"
  | "TENANT_MISMATCH"
  | "DEVICE_LIMIT"
  | "TWO_FACTOR_REQUIRED"
  | "TWO_FACTOR_INVALID"
  | "TWO_FACTOR_NOT_SETUP"
  | "INVALID_TOKEN"
  | "REFRESH_INVALID"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "INTERNAL"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "OTP_INVALID";

export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly status: number;
  public readonly metadata?: Record<string, unknown>;

  constructor(code: AuthErrorCode, status: number, message?: string, metadata?: Record<string, unknown>) {
    super(message ?? code);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
    if (metadata) this.metadata = metadata;

    // keep stack clean
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export const AuthErrors = {
  invalidCredentials: () => new AuthError("INVALID_CREDENTIALS", 401, "Invalid email or password"),
  authInvalid: () => new AuthError("AUTH_INVALID", 401, "Authentication invalid"),

  tenantUnknown: (slug?: string) =>
    new AuthError("TENANT_UNKNOWN", 400, "Unknown tenant", slug ? { slug } : undefined),

  tenantRequired: () => new AuthError("TENANT_REQUIRED", 400, "Tenant required"),
  tenantMismatch: () => new AuthError("TENANT_MISMATCH", 403, "Tenant mismatch"),

  deviceLimit: (max: number) => new AuthError("DEVICE_LIMIT", 403, "Device limit reached", { max }),

  twoFactorRequired: () => new AuthError("TWO_FACTOR_REQUIRED", 401, "Two-factor authentication required"),
  twoFactorInvalid: () => new AuthError("TWO_FACTOR_INVALID", 401, "Invalid two-factor code"),
  twoFactorNotSetup: () => new AuthError("TWO_FACTOR_NOT_SETUP", 400, "Two-factor is not set up"),

  invalidToken: () => new AuthError("INVALID_TOKEN", 401, "Invalid or expired token"),
  refreshInvalid: () => new AuthError("REFRESH_INVALID", 401, "Invalid refresh token"),

  rateLimited: () => new AuthError("RATE_LIMITED", 429, "Too many requests"),

  validation: (details?: Record<string, unknown>) =>
    new AuthError("VALIDATION_ERROR", 400, "Validation error", details),

  forbidden: () => new AuthError("FORBIDDEN", 403, "Forbidden"),
  notFound: (message = "Not found") => new AuthError("NOT_FOUND", 404, message),

  badRequest: (message = "Bad request", metadata?: Record<string, unknown>) =>
    new AuthError("BAD_REQUEST", 400, message, metadata),

  otpInvalid: () => new AuthError("OTP_INVALID", 401, "Invalid OTP"),

  internal: () => new AuthError("INTERNAL", 500, "Internal server error"),
} as const;
