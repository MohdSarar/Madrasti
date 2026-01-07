import type { NextFunction, Response } from "express";
import { AuthClient } from "../client/AuthClient.js";
import type { AuthRequest } from "../types/auth.js";

/**
 * Minimal Redis contract to avoid type conflicts in monorepos.
 * Compatible with node-redis: createClient() as long as it exposes get() and setEx().
 */
export type RedisCacheLike = {
  get(key: string): Promise<string | null>;
  setEx?(key: string, ttlSeconds: number, value: string): Promise<unknown>;
};

export function authenticate(options: {
  authServiceUrl: string;
  serviceToken: string;
  redis?: RedisCacheLike;
  cacheTTLSeconds?: number;
}) {
  const client = new AuthClient({
    baseURL: options.authServiceUrl,
    serviceToken: options.serviceToken,
  });

  const ttl = options.cacheTTLSeconds ?? 60;

  return async function (req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ code: "AUTH_MISSING", message: "Authorization header missing" });
    }

    const token = header.substring(7);
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

      const result = await client.validateAccessToken(token);
      if (!result.valid) {
        return res
          .status(401)
          .json({ code: result.code, message: result.message });
      }

      req.auth = {
        sub: result.user.id,
        email: result.user.email,
        role: result.user.role as any,
        school_id: result.user.school_id,
        permissions: result.user.permissions ?? [],
      };

      // Cache only if the redis client supports setEx (some minimal mocks may not)
      if (options.redis?.setEx) {
        await options.redis.setEx(cacheKey, ttl, JSON.stringify(req.auth));
      }

      return next();
    } catch {
      // Keep errors opaque (security) while still being observable via logs upstream.
      return res
        .status(500)
        .json({ code: "AUTH_MIDDLEWARE_ERROR", message: "Auth middleware error" });
    }
  };
}
