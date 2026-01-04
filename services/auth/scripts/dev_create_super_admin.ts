import { createUser } from "../src/repositories/userRepo.js";
import { hashPassword } from "../src/services/password.js";
import { pool } from "../src/db.js";
import { logger } from "../src/logger.js";

async function run() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@madrasti.local";
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "SuperAdmin12345!";

  const passHash = await hashPassword(password);
  const user = await createUser({
    schoolId: null,
    email,
    passwordHash: passHash,
    role: "super_admin",
    preferredLanguage: "en",
    firstNameAr: "مشرف",
    lastNameAr: "عام",
  });

  logger.info("super admin created", { email, password, userId: user.id });
  await pool.end();
}

run().catch((err) => {
  logger.error("create super admin failed", { err: String(err?.stack ?? err) });
  process.exit(1);
});
