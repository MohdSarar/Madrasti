import request from "supertest";

import { createSchool, generateTOTP, insertUser } from "./helpers.js";
import { generateTotpSecret } from "../src/services/totp.js";

describe("2FA enforcement", () => {
  test("staff with enabled 2FA must provide TOTP", async () => {
    const school = await createSchool({ slug: "2fa-required" });
    const secret = generateTotpSecret("Madrasti", "2fa-required@local");
    await insertUser({
      email: "2fa-required@local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
      twoFactorEnabled: true,
      twoFactorSecretBase32: secret.base32,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: "2fa-required@local", password: "Correct12345!" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TWO_FACTOR_REQUIRED");
  });

  test("invalid TOTP rejected", async () => {
    const school = await createSchool({ slug: "2fa-invalid" });
    const secret = generateTotpSecret("Madrasti", "2fa-invalid@local");
    await insertUser({
      email: "2fa-invalid@local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
      twoFactorEnabled: true,
      twoFactorSecretBase32: secret.base32,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const res = await request(app)
      .post("/v1/auth/login")
      .send({
        email: "2fa-invalid@local",
        password: "Correct12345!",
        totp: "000000",
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TWO_FACTOR_INVALID");
  });

  test("valid TOTP allows login", async () => {
    const school = await createSchool({ slug: "2fa-valid" });
    const secret = generateTotpSecret("Madrasti", "2fa-valid@local");
    await insertUser({
      email: "2fa-valid@local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
      twoFactorEnabled: true,
      twoFactorSecretBase32: secret.base32,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const totp = generateTOTP(secret.base32);
    const res = await request(app)
      .post("/v1/auth/login")
      .send({
        email: "2fa-valid@local",
        password: "Correct12345!",
        totp,
      })
      .expect(200);

    expect(res.body.two_factor?.verified).toBe(true);
    expect(typeof res.body.access_token).toBe("string");
  });

  test("2FA setup + verify enables it", async () => {
    const school = await createSchool({ slug: "2fa-setup" });
    await insertUser({
      email: "2fa-setup@local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
      twoFactorEnabled: false,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const login = await request(app)
      .post("/v1/auth/login")
      .send({ email: "2fa-setup@local", password: "Correct12345!" })
      .expect(200);

    const setup = await request(app)
      .post("/v1/auth/2fa/setup")
      .set("Authorization", `Bearer ${login.body.access_token}`)
      .expect(200);

    expect(typeof setup.body.secret_base32).toBe("string");

    const token = generateTOTP(setup.body.secret_base32);
    const verify = await request(app)
      .post("/v1/auth/2fa/verify")
      .set("Authorization", `Bearer ${login.body.access_token}`)
      .send({ token })
      .expect(200);

    expect(verify.body.ok).toBe(true);
  });
});
