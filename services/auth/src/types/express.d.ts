import "express-serve-static-core";

import type { UserRole } from "../domain/roles.js";

declare module "express-serve-static-core" {
  interface Request {
    /** Tenant context (set by tenant middleware). */
    tenant?: {
      schoolId: string | null;
    };

    /** Auth context (set by requireAuth middleware). */
    auth?: {
      userId: string;
      schoolId: string | null;
      role: UserRole;
      preferredLanguage?: string | null;
      twoFactor: boolean;
      sid?: string;
    };
  }
}

export {};
