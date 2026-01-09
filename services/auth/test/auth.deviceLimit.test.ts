import request from "supertest";

import { createSchool, insertUser } from "./helpers.js";
import { config } from "../src/config.js";

describe("Auth - device limit (compat)", () => {
  test("login fails with DEVICE_LIMIT when maxDevicesPerUser is reached", async () => {
    const school = await createSchool({ slug: "device-limit-compat" });

    await insertUser({
      email: "device@example.com",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    // Reach the configured device/session limit by logging in multiple times.
    for (let i = 0; i < config.maxDevicesPerUser; i++) {
      await request(app)
        .post("/v1/auth/login")
        .set("User-Agent", `jest-compat-${i}`)
        .send({ email: "device@example.com", password: "Correct12345!" })
        .expect(200);
    }

    const res = await request(app)
      .post("/v1/auth/login")
      .set("User-Agent", "jest-compat-over")
      .send({ email: "device@example.com", password: "Correct12345!" });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe("DEVICE_LIMIT");
  });
});
