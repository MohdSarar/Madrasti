import request from "supertest";

import { createSchool, insertUser } from "./helpers.js";

describe("Tenant isolation (mismatch)", () => {
  test("TENANT_MISMATCH when x-school-slug does not match JWT school_id", async () => {
    const schoolA = await createSchool({ slug: "school-a" });
    const schoolB = await createSchool({ slug: "school-b" });

    await insertUser({
      email: "tenant@example.com",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: schoolA.id,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    // Login as a user belonging to tenant A
    const login = await request(app)
      .post("/v1/auth/login")
      .set("x-school-slug", schoolA.slug)
      .send({ email: "tenant@example.com", password: "Correct12345!" })
      .expect(200);

    const access = login.body.access_token as string;

    // Call an authenticated route but with a different tenant header
    const res = await request(app)
      .post("/v1/auth/2fa/setup")
      .set("Authorization", `Bearer ${access}`)
      .set("x-school-slug", schoolB.slug);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("TENANT_MISMATCH");
  });
});
