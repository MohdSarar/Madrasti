import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/http.js";
import { canCreateSchool } from "../domain/permissions.js";
import { createSchool } from "../repositories/schoolRepo.js";
import { createUser } from "../repositories/userRepo.js";
import { hashPassword } from "../services/password.js";

export const createSchoolTenant = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new HttpError(401, "AUTH_MISSING", "Not authenticated");
  if (!canCreateSchool(req.auth.role)) throw new HttpError(403, "FORBIDDEN", "Not allowed");

  type CreateSchoolBody = {
    name_ar: string;
    name_en?: string | null;
    name_fr?: string | null;
    slug: string;
    school_type?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    primary_language?: "ar" | "en" | "fr";
    admin_email: string;
    admin_password: string;
    admin_first_name_ar: string;
    admin_last_name_ar: string;
  };

  const body = req.body as CreateSchoolBody;

  const school = await createSchool({
    nameAr: body.name_ar,
    nameEn: body.name_en ?? null,
    nameFr: body.name_fr ?? null,
    slug: body.slug,
    schoolType: body.school_type ?? null,
    contactEmail: body.contact_email ?? null,
    contactPhone: body.contact_phone ?? null,
    primaryLanguage: body.primary_language ?? "ar",
  });

  const passwordHash = await hashPassword(body.admin_password);

  const admin = await createUser({
    schoolId: school.id,
    email: body.admin_email,
    passwordHash,
    role: "school_admin",
    preferredLanguage: body.primary_language ?? "ar",
    firstNameAr: body.admin_first_name_ar,
    lastNameAr: body.admin_last_name_ar,
  });

  res.status(201).json({ school_id: school.id, school_slug: body.slug, school_admin_user_id: admin.id });
});
