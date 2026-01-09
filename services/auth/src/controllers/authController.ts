import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/http.js";
import { findUserByEmail, markUserLastLogin, setUser2faSecret, enableUser2fa, findUserById } from "../repositories/userRepo.js";
import * as userRepo from "../repositories/userRepo.js";
import * as passwordResetRepo from "../repositories/passwordResetRepo.js";
import * as emailVerificationRepo from "../repositories/emailVerificationRepo.js";
import * as sessionRepo from "../repositories/sessionRepo.js";
import { verifyPassword, hashPassword } from "../services/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../services/jwt.js";
import { createSession, updateSessionToken, deleteSessionByToken, getSessionByToken, countActiveSessions } from "../repositories/sessionRepo.js";
import { config } from "../config.js";
import { isStaffRole } from "../domain/roles.js";
import { generateTotpSecret, otpauthToQrDataUrl, verifyTotp } from "../services/totp.js";
import { generateOtpCode, storeOtp, verifyOtp } from "../services/otp.js";
import { getSmsProvider } from "../services/smsProvider.js";
import crypto from "crypto";
import { randomToken, sha256 } from "../utils/crypto.js";
import { getSecurityClient, getSecurityEmitter } from "../services/securitySdk.js";

function deviceInfoFromReq(req: Request) {
  return {
    ip: req.ip ?? null,
    user_agent: req.header("user-agent") ?? null,
    x_forwarded_for: req.header("x-forwarded-for") ?? null,
  };
}

type LoginBody = {
  email: string;
  password: string;
  totp?: string;
  school_slug?: string;
};

type RefreshBody = {
  refresh_token: string;
};

type PhoneRequestOtpBody = { phone: string };

type PhoneVerifyOtpBody = { request_id: string; phone: string; code: string };

type Verify2faBody = { token: string };

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, totp } = req.body as LoginBody;

  const securityClient = getSecurityClient();
  const securityEmitter = getSecurityEmitter();

const user = await findUserByEmail(email);
  if (!user || !user.is_active || !user.password_hash) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  
  // Step 4: account lockout (best-effort)
  if (securityClient && user.school_id) {
    const st: any = await securityClient.getLockoutStatus({ userId: user.id, schoolId: user.school_id }).catch(() => null);
    const payload = (st as any)?.data ?? (st as any);
    const data = (payload as any)?.data ?? payload;
    if (data?.isLocked) {
      throw new HttpError(423, "ACCOUNT_LOCKED", `Account locked until ${data.lockedUntil ?? "unknown"}`);
    }
  }

const ok = await verifyPassword(user.password_hash, password);
  if (!ok) {
    if (securityClient && user.school_id) {
      const r: any = await securityClient.recordFailedAttempt({ userId: user.id, schoolId: user.school_id, reason: "bad_password" }).catch(() => null);
      const payload = (r as any)?.data ?? (r as any);
      const data = (payload as any)?.data ?? payload;
      if (data?.locked) {
        throw new HttpError(423, "ACCOUNT_LOCKED", `Account locked until ${data.lockedUntil ?? "unknown"}`);
      }
    }
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  // successful login -> reset lockout counter (best-effort) + audit
  if (securityClient) {
    await securityClient.unlockAccount({ userId: user.id }).catch(() => undefined);
  }
  if (securityEmitter) {
    await securityEmitter.emit({
      event_type: "LOGIN_SUCCESS",
      event_source: "auth",
      user_id: user.id,
      
      action: "LOGIN",
      status: "SUCCESS",
      details: { method: "password" },
      severity: "LOW"
    });
  }

  // Tenant handling: for non-super roles, user must belong to a school
  if (user.role !== "super_admin" && !user.school_id) {
    throw new HttpError(400, "TENANT_MISSING", "User has no school tenant");
  }

  // Staff 2FA requirement
  const staff2faRequired = config.staff2faRequired && isStaffRole(user.role);
  const has2fa = Boolean(user.two_factor_enabled && user.two_factor_secret);

  let twoFactorOk = false;
  if (staff2faRequired) {
    if (!has2fa) {
      // allow login but mark 2fa false, client must setup/verify
      twoFactorOk = false;
    } else {
      if (!totp) throw new HttpError(401, "TWO_FACTOR_REQUIRED", "TOTP required");
      const verified = verifyTotp(totp, user.two_factor_secret!);
      if (!verified) throw new HttpError(401, "TWO_FACTOR_INVALID", "Invalid TOTP");
      twoFactorOk = true;
    }
  } else if (has2fa && totp) {
    const verified = verifyTotp(totp, user.two_factor_secret!);
    if (!verified) throw new HttpError(401, "TWO_FACTOR_INVALID", "Invalid TOTP");
    twoFactorOk = true;
  }

  // Enforce device limit
  const active = await countActiveSessions(user.id);
  if (active >= config.maxDevicesPerUser) {
    throw new HttpError(429, "DEVICE_LIMIT", "Too many active devices");
  }

  // Create refresh session (refresh token signed with session id)
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlSeconds * 1000);

  // 1) create session with placeholder token
  const placeholder = "placeholder_" + Math.random().toString(36).slice(2);
  const session = await createSession({
    userId: user.id,
    token: placeholder,
    expiresAt,
    deviceInfo: deviceInfoFromReq(req),
  });

  // 2) sign refresh token using session id
  const refreshToken = signRefreshToken(user.id, session.id);

  // 3) store real token hash
  await updateSessionToken(session.id, refreshToken);

  const accessToken = signAccessToken({
    sub: user.id,
    school_id: user.school_id ?? null,
    role: user.role,
    preferred_language: user.preferred_language,
    two_factor: twoFactorOk,
  });

  await markUserLastLogin(user.id);

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: config.jwt.accessTtlSeconds,
    two_factor: { enabled: has2fa, verified: twoFactorOk, required: staff2faRequired },
    session_id: session.id,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body as RefreshBody;

  let payload: { sub: string; sid: string };
  try {
    payload = verifyRefreshToken(refresh_token);
  } catch {
    // Malformed/invalid JWT (signature/format/exp/etc.)
    throw new HttpError(401, "INVALID_TOKEN", "Invalid token");
  }

  const session = await getSessionByToken(refresh_token);
  if (!session) throw new HttpError(401, "REFRESH_INVALID", "Invalid refresh token");
  if (session.user_id !== payload.sub || session.id !== payload.sid) {
    throw new HttpError(401, "REFRESH_INVALID", "Invalid refresh token");
  }

  const user = await findUserById(payload.sub);
  if (!user || !user.is_active) throw new HttpError(401, "AUTH_INVALID", "User inactive");

  const accessToken = signAccessToken({
    sub: user.id,
    school_id: user.school_id ?? null,
    role: user.role,
    preferred_language: user.preferred_language,
    two_factor: Boolean(user.two_factor_enabled), // access token indicates 2FA enabled; verification still happens at login
  });

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: config.jwt.accessTtlSeconds,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body as RefreshBody;
  if (!refresh_token) throw new HttpError(400, "BAD_REQUEST", "refresh_token required");
  await deleteSessionByToken(refresh_token);
  res.json({ ok: true });
});

export const setup2fa = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new HttpError(401, "AUTH_MISSING", "Not authenticated");
  const user = await findUserById(req.auth.userId);
  if (!user) throw new HttpError(404, "NOT_FOUND", "User not found");

  const email = user.email ?? `user-${user.id}`;
  const secret = generateTotpSecret("Madrasti", email);

  await setUser2faSecret(user.id, secret.base32);

  const qr = secret.otpauth_url ? await otpauthToQrDataUrl(secret.otpauth_url) : null;

  res.json({
    secret_base32: secret.base32,
    otpauth_url: secret.otpauth_url,
    qr_data_url: qr,
  });
});

export const verify2fa = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new HttpError(401, "AUTH_MISSING", "Not authenticated");
  const { token } = req.body as Verify2faBody;
  const user = await findUserById(req.auth.userId);
  if (!user || !user.two_factor_secret) throw new HttpError(400, "TWO_FACTOR_NOT_SETUP", "2FA not setup");

  const ok = verifyTotp(token, user.two_factor_secret);
  if (!ok) throw new HttpError(401, "TWO_FACTOR_INVALID", "Invalid TOTP");

  await enableUser2fa(user.id);

  res.json({ ok: true });
});

export const requestPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body as PhoneRequestOtpBody;
  const code = generateOtpCode();
  const { requestId } = await storeOtp(phone, code);
  await getSmsProvider().sendOtp(phone, code);
  res.json({ request_id: requestId, ttl_seconds: config.otpCodeTtlSeconds });
});

export const verifyPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const { request_id, phone, code } = req.body as PhoneVerifyOtpBody;
  const ok = await verifyOtp(request_id, phone, code);
  if (!ok) throw new HttpError(401, "OTP_INVALID", "Invalid OTP");
  res.json({ ok: true });
});

type ChangePasswordBody = { oldPassword: string; newPassword: string };
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body as ChangePasswordBody;
  const auth = (req as any).auth as { userId: string; schoolId?: string };
  const user = await findUserById(auth.userId);
  if (!user || !user.password_hash) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  const ok = await verifyPassword(user.password_hash, oldPassword);
  if (!ok) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");

  const securityClient = getSecurityClient();
  const securityEmitter = getSecurityEmitter();

  if (securityClient && user.school_id) {
    await securityClient.validatePassword({ password: newPassword, schoolId: user.school_id, userId: user.id }).catch(() => undefined);
  }

  const newHash = await hashPassword(newPassword);
  await userRepo.updatePasswordHash(user.id, newHash);

  if (securityEmitter) {
    await securityEmitter.emit({
      event_type: "PASSWORD_CHANGED",
      event_source: "auth",
      user_id: user.id,
      
      action: "PASSWORD_CHANGE",
      status: "SUCCESS",
      details: { method: "user_initiated" },
      severity: "MEDIUM",
    });
  }

  return res.json({ success: true });
});

type ResetRequestBody = { email: string };
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as ResetRequestBody;
  const user = await findUserByEmail(email);

  // Always return OK (no account enumeration)
  if (!user || !user.is_active) return res.json({ success: true });

  const tokenRaw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(tokenRaw).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await passwordResetRepo.createResetToken({ userId: user.id, tokenHash, expiresAt });

  const securityEmitter = getSecurityEmitter();
  if (securityEmitter) {
    await securityEmitter.emit({
      event_type: "PASSWORD_RESET_REQUESTED",
      event_source: "auth",
      user_id: user.id,
      
      action: "PASSWORD_RESET_REQUEST",
      status: "INFO",
      details: { channel: "email" },
      severity: "MEDIUM",
    });
  }

  if (process.env['NODE_ENV'] !== "production") {
    return res.json({ success: true, devToken: tokenRaw });
  }
  return res.json({ success: true });
});

type ResetConfirmBody = { token: string; newPassword: string };
export const confirmPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as ResetConfirmBody;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const row = await passwordResetRepo.consumeResetToken({ tokenHash });
  if (!row) throw new HttpError(400, "RESET_TOKEN_INVALID", "Invalid or expired token");

  const user = await findUserById(row.user_id);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  const securityClient = getSecurityClient();
  const securityEmitter = getSecurityEmitter();

  if (securityClient && user.school_id) {
    await securityClient.validatePassword({ password: newPassword, schoolId: user.school_id, userId: user.id }).catch(() => undefined);
  }

  const newHash = await hashPassword(newPassword);
  await userRepo.updatePasswordHash(user.id, newHash);

  // Global revoke: delete all sessions after reset
  await sessionRepo.deleteAllForUser(user.id);

  if (securityEmitter) {
    await securityEmitter.emit({
      event_type: "PASSWORD_RESET_CONFIRMED",
      event_source: "auth",
      user_id: user.id,
      
      action: "PASSWORD_RESET_CONFIRM",
      status: "SUCCESS",
      details: {},
      severity: "HIGH",
    });
  }

  return res.json({ success: true });
});

export const revokeAllSessions = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as any).auth as { userId: string };
  await sessionRepo.deleteAllForUser(auth.userId);

  const securityEmitter = getSecurityEmitter();
  if (securityEmitter) {
    await securityEmitter.emit({
      event_type: "SESSIONS_REVOKED",
      event_source: "auth",
      user_id: auth.userId,
      action: "REVOKE_ALL_SESSIONS",
      status: "SUCCESS",
      details: {},
      severity: "MEDIUM",
    });
  }

  return res.json({ success: true });
});

export const getSecuritySettings = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ success: true, data: { lockoutEnabled: true, passwordRotationDays: 90 } });
});

export const updateSecuritySettings = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ success: true });
});


type EmailVerificationRequestBody = { user_id?: string };
export const requestEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as any).auth as { userId: string; schoolId?: string; role?: string };
  const body = req.body as EmailVerificationRequestBody;
  const targetUserId = body.user_id ?? auth.userId;

  // Only allow requesting for self for now (enterprise: allow staff/admin to request for others).
  if (targetUserId !== auth.userId) {
    throw new HttpError(403, "FORBIDDEN", "Can only request email verification for current user");
  }

  const user = await findUserById(targetUserId);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  if (!user.email) throw new HttpError(400, "EMAIL_REQUIRED", "User has no email");
  // If already verified, idempotent success
  const row = await (await import("../db.js")).pool.query<{ email_verified: boolean }>(
    "SELECT email_verified FROM users WHERE id=$1",
    [user.id]
  );
  if (row.rows[0]?.email_verified) {
    return res.json({ success: true, data: { alreadyVerified: true } });
  }

  const token = randomToken(32);
  const tokenHash = sha256(token);
  const expires = new Date(Date.now() + config.emailVerificationTokenTtlMinutes * 60 * 1000);

  await emailVerificationRepo.deleteTokensForUser(user.id);
  await emailVerificationRepo.createToken({ userId: user.id, tokenHash, expiresAt: expires });

  // Best-effort audit trail
  const securityEmitter = getSecurityEmitter();
  if (securityEmitter) {
    const schoolId = user.school_id ?? undefined;
    await securityEmitter.emit({
      event_type: "EMAIL_VERIFICATION_REQUESTED",
      event_source: "auth",
      user_id: user.id,
      ...(schoolId ? { school_id: schoolId } : {}),
      action: "EMAIL_VERIFY_REQUEST",
      status: "INFO",
      details: { email: user.email, expiresAt: expires.toISOString() },
      severity: "LOW",
    });
  }

  const data: any = { sent: true };
  if (config.exposeEmailVerificationToken) data.token = token; // dev/test convenience only
  return res.json({ success: true, data });
});

type EmailVerificationConfirmBody = { token: string };
export const confirmEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as EmailVerificationConfirmBody;
  const tokenHash = sha256(token);
  const consumed = await emailVerificationRepo.consumeToken({ tokenHash });
  if (!consumed) {
    throw new HttpError(400, "INVALID_TOKEN", "Invalid or expired verification token");
  }

  await userRepo.setEmailVerified(consumed.userId, true);
  await emailVerificationRepo.deleteTokensForUser(consumed.userId);

  const securityEmitter = getSecurityEmitter();
  if (securityEmitter) {
    await securityEmitter.emit({
      event_type: "EMAIL_VERIFIED",
      event_source: "auth",
      user_id: consumed.userId,
      action: "EMAIL_VERIFY_CONFIRM",
      status: "SUCCESS",
      details: { verifiedAt: new Date().toISOString() },
      severity: "LOW",
    });
  }

  return res.json({ success: true, data: { verified: true } });
});

type GdprForgetBody = { reason?: string };
export const gdprForgetMe = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as any).auth as { userId: string; schoolId?: string };
  const body = req.body as GdprForgetBody;

  // Best-effort notify security service for audit/compliance tracking
  const securityClient = getSecurityClient();
  if (securityClient) {
    const payload = auth.schoolId ? { userId: auth.userId, schoolId: auth.schoolId } : { userId: auth.userId };
    await securityClient.gdprForget(payload).catch(() => undefined);
  }

  // With exactOptionalPropertyTypes, avoid passing explicit undefined for optional props.
  const anonymizeArgs: { userId: string; reason?: string } = { userId: auth.userId };
  if (body.reason) anonymizeArgs.reason = body.reason;
  await userRepo.gdprAnonymizeUser(anonymizeArgs);
  await sessionRepo.deleteAllForUser(auth.userId);

  const securityEmitter = getSecurityEmitter();
  if (securityEmitter) {
    const schoolId = auth.schoolId ?? undefined;
    await securityEmitter.emit({
      event_type: "GDPR_FORGET_REQUESTED",
      event_source: "auth",
      user_id: auth.userId,
      ...(schoolId ? { school_id: schoolId } : {}),
      action: "GDPR_FORGET",
      status: "INFO",
      details: { reason: body.reason ?? null },
      severity: "MEDIUM",
    });
  }

  return res.json({ success: true, data: { status: "accepted" } });
});
