export const UserRole = {
  SUPER_ADMIN: "super_admin",
  SCHOOL_ADMIN: "school_admin",
  TEACHER: "teacher",
  PARENT: "parent",
  STUDENT: "student",
  ACCOUNTANT: "accountant",
  LIBRARIAN: "librarian",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export function isStaffRole(role: UserRole): boolean {
  return (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.SCHOOL_ADMIN ||
    role === UserRole.TEACHER ||
    role === UserRole.ACCOUNTANT ||
    role === UserRole.LIBRARIAN
  );
}
