import request from "supertest";
import jwt from "jsonwebtoken";

import { createSchool, insertUser } from "./helpers.js";
import { config } from "../src/config.js";

describe("Authentication failures", () => {
  test("wrong password", async () => {
    const school = await createSchool({ slug: "neg-wrong-pass" });
    await insertUser({
      email: "user1@neg.local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const res = await request(app).post("/v1/auth/login").send({
      email: "user1@neg.local",
      password: "WRONG12345!",
    });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  test("unknown email", async () => {
    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const res = await request(app).post("/v1/auth/login").send({
      email: "unknown@neg.local",
      password: "AnyPassword12345!",
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  test("disabled user", async () => {
    const school = await createSchool({ slug: "neg-disabled" });
    await insertUser({
      email: "disabled@neg.local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
      isActive: false,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const res = await request(app).post("/v1/auth/login").send({
      email: "disabled@neg.local",
      password: "Correct12345!",
    });

    // Current implementation returns INVALID_CREDENTIALS for inactive users.
    // Step 2 target may introduce a dedicated ACCOUNT_DISABLED code.
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("Refresh token failures", () => {
  test("invalid refresh token (well-formed JWT but unknown session)", async () => {
    const school = await createSchool({ slug: "neg-refresh-invalid" });
    const { id: userId } = await insertUser({
      email: "refresh@neg.local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
    });

    const bogus = jwt.sign({ sub: userId, sid: "00000000-0000-0000-0000-000000000000" }, config.jwt.refreshSecret, {
      expiresIn: 3600,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const res = await request(app).post("/v1/auth/refresh").send({ refresh_token: bogus });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("REFRESH_INVALID");
  });

  test("refresh after logout", async () => {
    const school = await createSchool({ slug: "neg-refresh-after-logout" });
    await insertUser({
      email: "logout@neg.local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const login = await request(app)
      .post("/v1/auth/login")
      .send({ email: "logout@neg.local", password: "Correct12345!" })
      .expect(200);

    await request(app)
      .post("/v1/auth/logout")
      .send({ refresh_token: login.body.refresh_token })
      .expect(200);

    const res = await request(app)
      .post("/v1/auth/refresh")
      .send({ refresh_token: login.body.refresh_token });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("REFRESH_INVALID");
  });
});
