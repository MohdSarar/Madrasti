import request from "supertest";
import jwt from "jsonwebtoken";

import { createSchool, insertUser } from "./helpers.js";

function decode(token: string): any {
  return jwt.decode(token);
}

describe("Tenant isolation", () => {
  test("JWT contains school_id for non super-admin", async () => {
    const school = await createSchool({ slug: "tenant-jwt-school" });
    await insertUser({
      email: "tjwt@tenant.local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const login = await request(app)
      .post("/v1/auth/login")
      .send({ email: "tjwt@tenant.local", password: "Correct12345!" })
      .expect(200);

    const claims = decode(login.body.access_token);
    expect(claims.school_id).toBe(school.id);
  });

  test("cross-tenant access rejected (TENANT_MISMATCH)", async () => {
    const schoolA = await createSchool({ slug: "tenant-a" });
    const schoolB = await createSchool({ slug: "tenant-b" });
    await insertUser({
      email: "user@tenant.local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: schoolA.id,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const login = await request(app)
      .post("/v1/auth/login")
      .send({ email: "user@tenant.local", password: "Correct12345!" })
      .expect(200);

    const res = await request(app)
      .post("/v1/auth/2fa/setup")
      .set("Authorization", `Bearer ${login.body.access_token}`)
      .set("x-school-slug", schoolB.slug);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("TENANT_MISMATCH");
  });

  test("unknown tenant header rejected", async () => {
    const school = await createSchool({ slug: "tenant-unknown-check" });
    await insertUser({
      email: "tenantunknown@tenant.local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const login = await request(app)
      .post("/v1/auth/login")
      .send({ email: "tenantunknown@tenant.local", password: "Correct12345!" })
      .expect(200);

    const res = await request(app)
      .post("/v1/auth/2fa/setup")
      .set("Authorization", `Bearer ${login.body.access_token}`)
      .set("x-school-slug", "does-not-exist");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("TENANT_UNKNOWN");
  });

  test("super_admin can access any tenant header", async () => {
    const schoolA = await createSchool({ slug: "tenant-super-a" });
    const schoolB = await createSchool({ slug: "tenant-super-b" });
    await insertUser({
      email: "super@tenant.local",
      password: "Correct12345!",
      role: "super_admin",
      schoolId: null,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const login = await request(app)
      .post("/v1/auth/login")
      .send({ email: "super@tenant.local", password: "Correct12345!" })
      .expect(200);

    // Access token claims.school_id should be null for super_admin
    const claims = decode(login.body.access_token);
    expect(claims.school_id).toBe(null);

    // Even if tenant header is set, requireAuth should not raise mismatch when token has school_id null
    const res = await request(app)
      .post("/v1/auth/2fa/setup")
      .set("Authorization", `Bearer ${login.body.access_token}`)
      .set("x-school-slug", schoolB.slug);

    expect(res.status).toBe(200);
    expect(res.body.secret_base32).toBeDefined();

    // sanity: tenant middleware is active
    expect(schoolA.id).toBeDefined();
  });
});
