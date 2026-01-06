import { createSchool } from "../src/repositories/schoolRepo.js";
import { createUser } from "../src/repositories/userRepo.js";
import { hashPassword } from "../src/services/password.js";
import { pool } from "../src/db.js";
import { logger } from "../src/logger.js";

async function run() {
  const school = await createSchool({
    nameAr: "مدرسة التجربة",
    nameEn: "Demo School",
    nameFr: "École Démo",
    slug: "demo-school",
    schoolType: "mixed",
    contactEmail: "contact@demo.school",
    contactPhone: "+201000000000",
    primaryLanguage: "ar",
  });

  const adminPass = await hashPassword("Admin12345!");
  const admin = await createUser({
    schoolId: school.id,
    email: "admin@demo.school",
    passwordHash: adminPass,
    role: "school_admin",
    preferredLanguage: "ar",
    firstNameAr: "مدير",
    lastNameAr: "المدرسة",
  });

  const teacherPass = await hashPassword("Teacher12345!");
  await createUser({
    schoolId: school.id,
    email: "teacher@demo.school",
    passwordHash: teacherPass,
    role: "teacher",
    preferredLanguage: "ar",
    firstNameAr: "معلم",
    lastNameAr: "أحمد",
  });

  logger.info({ schoolId: school.id, adminUserId: admin.id }, "seed done");
  await pool.end();
}

run().catch((err) => {
  logger.error({ err: String(err?.stack ?? err) }, "seed failed");
  process.exit(1);
});
