import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthClient } from "../client/AuthClient.js";
import type { AuthRequest } from "../types/auth.js";

export type RedisCacheLike = {
  get(key: string): Promise<string | null>;
  setEx?(key: string, ttlSeconds: number, value: string): Promise<unknown>;
};

export function authenticate(options: {
  authServiceUrl: string;
  serviceToken: string;
  redis?: RedisCacheLike;
  cacheTTLSeconds?: number;
  /** JWT access secret for local in-process verification. Falls back to JWT_ACCESS_SECRET env var.
   *  When available, eliminates the HTTP call to auth service on every request. */
  jwtSecret?: string;
}) {
  // Prefer explicit secret → env var → fall back to HTTP call.
  const secret = options.jwtSecret ?? process.env["JWT_ACCESS_SECRET"];

  // HTTP client is only created when no secret is available.
  const httpClient = secret
    ? null
    : new AuthClient({ baseURL: options.authServiceUrl, serviceToken: options.serviceToken });

  const ttl = options.cacheTTLSeconds ?? 60;

  return async function (req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ code: "AUTH_MISSING", message: "Authorization header missing" });
    }

    const token = header.substring(7);

    // ── Fast path: local JWT verification (no network hop) ────────────────────
    if (secret) {
      try {
        const payload = jwt.verify(token, secret) as Record<string, unknown>;

        // Respect revocation blacklist written by auth service on logout.
        if (options.redis) {
          const revoked = await options.redis.get(`token:revoked:${token}`);
          if (revoked) {
            return res.status(401).json({ code: "TOKEN_REVOKED", message: "Token has been revoked" });
          }
        }

        req.auth = {
          sub:         payload["sub"] as string,
          email:       (payload["email"] as string | undefined) ?? null,
          role:        payload["role"] as any,
          school_id:   (payload["school_id"] as string | undefined) ?? null,
          permissions: (payload["permissions"] as string[] | undefined) ?? [],
        };
        return next();
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          return res.status(401).json({ code: "TOKEN_EXPIRED", message: "Token has expired" });
        }
        return res.status(401).json({ code: "TOKEN_INVALID", message: "Invalid token" });
      }
    }

    // ── Fallback: HTTP verification with Redis cache ───────────────────────────
    const cacheKey = `auth:verify:${token}`;

    try {
      if (options.redis) {
        const cached = await options.redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as AuthRequest["auth"] | undefined;
          if (parsed) {
            req.auth = parsed;
            return next();
          }
        }
      }

      const result = await httpClient!.validateAccessToken(token);
      if (!result.valid) {
        return res.status(401).json({ code: result.code, message: result.message });
      }

      req.auth = {
        sub:         result.user.id,
        email:       result.user.email,
        role:        result.user.role as any,
        school_id:   result.user.school_id,
        permissions: result.user.permissions ?? [],
      };

      if (options.redis?.setEx) {
        await options.redis.setEx(cacheKey, ttl, JSON.stringify(req.auth));
      }

      return next();
    } catch {
      return res.status(500).json({ code: "AUTH_MIDDLEWARE_ERROR", message: "Auth middleware error" });
    }
  };
}
