import type { NextFunction, Response } from "express";
import type { AuthRequest, AuthContext } from "@madrasti/auth-sdk";

/**
 * Test-only auth bypass.
 * - Enabled when TEST_BYPASS_AUTH=1 (see config.testBypassAuth).
 * - Allows integration tests without having to boot the Auth service.
 */
export function bypassAuth(fixed?: Partial<AuthContext>) {
  const base: AuthContext = {
    sub: "test-user",
    email: "test@madrasti.local",
    role: "school_admin",
    school_id: "00000000-0000-0000-0000-000000000001",
    permissions: ["*"],
    ...fixed,
  };

  return function (req: AuthRequest, _res: Response, next: NextFunction) {
    req.auth = base;
    next();
  };
}
