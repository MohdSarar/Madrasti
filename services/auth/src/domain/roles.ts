/**
 * Centralized role definitions.
 *
 * IMPORTANT: Do not export a `type` and a `const` with the same name, because
 * eslint's core `no-redeclare` rule will flag it.
 */

export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  SCHOOL_ADMIN: "school_admin",
  STAFF: "staff",
  STUDENT: "student",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export function isStaffRole(role: UserRole): boolean {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.SCHOOL_ADMIN || role === USER_ROLES.STAFF;
}
