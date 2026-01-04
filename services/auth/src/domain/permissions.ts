import type { UserRole } from "./roles.js";

/**
 * Minimal RBAC for Step 1:
 * - super_admin: platform ops (create schools + school admins)
 * - school_admin: manage users within school (future steps)
 *
 * Fine-grained permissions described in specs will be implemented in Step 2/3.
 */
export function canCreateSchool(role: UserRole): boolean {
  return role === "super_admin";
}
