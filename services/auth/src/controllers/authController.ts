import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/http.js";
import { findUserByEmail, markUserLastLogin, setUser2faSecret, enableUser2fa, findUserById } from "../repositories/userRepo.js";
import { verifyPassword } from "../services/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../services/jwt.js";
import { createSession, updateSessionToken, deleteSessionByToken, getSessionByToken, countActiveSessions } from "../repositories/sessionRepo.js";
import { config } from "../config.js";
import { isStaffRole } from "../domain/roles.js";
import { generateTotpSecret, otpauthToQrDataUrl, verifyTotp } from "../services/totp.js";
import { generateOtpCode, storeOtp, verifyOtp } from "../services/otp.js";
import { getSmsProvider } from "../services/smsProvider.js";

function deviceInfoFromReq(req: Request) {
  return {
    ip: req.ip,
    user_agent: req.header("user-agent") ?? null,
    x_forwarded_for: req.header("x-forwarded-for") ?? null,
  };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, totp } = req.body as any;

  const user = await findUserByEmail(email);
  if (!user || !user.is_active || !user.password_hash) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  const ok = await verifyPassword(user.password_hash, password);
  if (!ok) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");

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
  const { refresh_token } = req.body as any;
  const payload = verifyRefreshToken(refresh_token);

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
  const { refresh_token } = req.body as any;
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
  const { token } = req.body as any;
  const user = await findUserById(req.auth.userId);
  if (!user || !user.two_factor_secret) throw new HttpError(400, "TWO_FACTOR_NOT_SETUP", "2FA not setup");

  const ok = verifyTotp(token, user.two_factor_secret);
  if (!ok) throw new HttpError(401, "TWO_FACTOR_INVALID", "Invalid TOTP");

  await enableUser2fa(user.id);

  res.json({ ok: true });
});

export const requestPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body as any;
  const code = generateOtpCode();
  const { requestId } = await storeOtp(phone, code);
  await getSmsProvider().sendOtp(phone, code);
  res.json({ request_id: requestId, ttl_seconds: config.otpCodeTtlSeconds });
});

export const verifyPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const { request_id, phone, code } = req.body as any;
  const ok = await verifyOtp(request_id, phone, code);
  if (!ok) throw new HttpError(401, "OTP_INVALID", "Invalid OTP");
  res.json({ ok: true });
});
