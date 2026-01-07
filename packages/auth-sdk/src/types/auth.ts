import type { Request } from "express";

export type UserRole =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "parent"
  | "student"
  | "staff";

export type Permission = string;

export type AuthContext = {
  sub: string;
  email: string | null;
  role: UserRole;
  school_id: string | null;
  permissions: Permission[];
};

export interface AuthRequest extends Request {
  auth?: AuthContext;
}
