import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { config } from "../config.js";
import { HttpError } from "../utils/http.js";
import * as userRepo from "../repositories/userRepo.js";
import { pool } from "../db.js";
import { USER_ROLES, type UserRole } from "../domain/roles.js";

function assertValidRole(role: unknown): UserRole {
  const roleStr = String(role);
  const allowed = Object.values(USER_ROLES) as UserRole[];
  if (!allowed.includes(roleStr as UserRole)) {
    throw new HttpError(400, "VALIDATION_ERROR", "invalid role");
  }
  return roleStr as UserRole;
}

export async function verifyAccessToken(req: Request, res: Response) {
  const token = (req.body?.token as string | undefined) ?? "";
  if (!token) throw new HttpError(400, "VALIDATION_ERROR", "token is required");

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as {
      sub?: string;
      permissions?: string[];
    };

    const userId = payload.sub;
    if (!userId) throw new HttpError(401, "TOKEN_INVALID", "missing sub");

    const user = await userRepo.findUserById(userId);
    if (!user) throw new HttpError(401, "TOKEN_INVALID", "user not found");

    return res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role, // assumed already typed in repo row/domain
        school_id: user.school_id ?? null, // ✅ fix: was schoolId
        permissions: payload.permissions ?? [],
      },
    });
  } catch (e: unknown) {
    const err = e as { name?: string };
    const code = err?.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
    return res.status(401).json({ valid: false, code, message: "Invalid token" });
  }
}

export async function createUser(req: Request, res: Response) {
  const body = req.body as {
    email?: unknown;
    password?: unknown;
    role?: unknown;
    school_id?: unknown;
    first_name_ar?: unknown;
    last_name_ar?: unknown;
  };

  const email = body.email ? String(body.email) : "";
  const password = body.password ? String(body.password) : "";
  const roleRaw = body.role;

  if (!email || !password || !roleRaw) {
    throw new HttpError(400, "VALIDATION_ERROR", "email, password, role are required");
  }

  const role = assertValidRole(roleRaw);
  const passwordHash = await argon2.hash(password);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const created = await userRepo.createUser({
      email: email.toLowerCase(),
      passwordHash,
      role, // ✅ UserRole, not string
      schoolId: body.school_id ? String(body.school_id) : null,
      ...(body.first_name_ar ? { firstNameAr: String(body.first_name_ar) } : {}),
      ...(body.last_name_ar ? { lastNameAr: String(body.last_name_ar) } : {}),
    });

    await client.query("COMMIT");
    return res.status(201).json({ id: created.id });
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
