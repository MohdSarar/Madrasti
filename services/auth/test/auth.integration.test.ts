import request from "supertest";

import { insertUser } from "./helpers.js";

describe("Auth service - critical flows", () => {
  test("GET /health returns ok", async () => {
    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test("login -> refresh -> logout works", async () => {
    await insertUser({
      email: "superadmin@madrasti.local",
      password: "SuperAdmin12345!",
      role: "super_admin",
      schoolId: null,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const login = await request(app)
      .post("/v1/auth/login")
      .send({ email: "superadmin@madrasti.local", password: "SuperAdmin12345!" })
      .expect(200);

    expect(typeof login.body.access_token).toBe("string");
    expect(typeof login.body.refresh_token).toBe("string");

    const refresh = await request(app)
      .post("/v1/auth/refresh")
      .send({ refresh_token: login.body.refresh_token })
      .expect(200);

    expect(typeof refresh.body.access_token).toBe("string");

    await request(app)
      .post("/v1/auth/logout")
      .send({ refresh_token: login.body.refresh_token })
      .expect(200);
  });
});
