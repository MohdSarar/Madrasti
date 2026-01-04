import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { UserRole } from "../domain/roles.js";

export type AccessTokenClaims = {
  sub: string; // user_id
  school_id: string | null;
  role: UserRole;
  preferred_language?: string | null;
  two_factor?: boolean;
};

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtlSeconds,
  });
}

export function signRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign(
    { sub: userId, sid: sessionId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshTtlSeconds }
  );
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenClaims;
}

export function verifyRefreshToken(token: string): { sub: string; sid: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { sub: string; sid: string };
}
