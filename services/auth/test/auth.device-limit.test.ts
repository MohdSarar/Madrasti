// services/auth/test/auth.device-limit.test.ts
import request from "supertest";

import {
  createSchool,
  countActiveSessions,
  expireSessionsForUser,
  insertUser,
} from "./helpers.js";
import { config } from "../src/config.js";

describe("Device/session limits", () => {
  test("rejects login when maxDevicesPerUser is reached", async () => {
    const school = await createSchool({ slug: "device-limit" });
    const { id: userId } = await insertUser({
      email: "device@local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    const tokens: string[] = [];
    for (let i = 0; i < config.maxDevicesPerUser; i++) {
      const login = await request(app)
        .post("/v1/auth/login")
        .set("User-Agent", `jest-${i}`)
        // If your tenant middleware requires a header, keep this enabled.
        // If not required, it's harmless.
        .set("x-school-id", school.id)
        .send({ email: "device@local", password: "Correct12345!" })
        .expect(200);

      tokens.push(login.body.refresh_token as string);
    }

    const active = await countActiveSessions(userId);
    expect(active).toBe(config.maxDevicesPerUser);

    const res = await request(app)
      .post("/v1/auth/login")
      .set("User-Agent", "jest-over")
      .set("x-school-id", school.id)
      .send({ email: "device@local", password: "Correct12345!" });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe("DEVICE_LIMIT");

    // cleanup: logout 1 session frees a slot
    await request(app)
      .post("/v1/auth/logout")
      .set("x-school-id", school.id)
      .send({ refresh_token: tokens[0] })
      .expect(200);

    await request(app)
      .post("/v1/auth/login")
      .set("User-Agent", "jest-after-logout")
      .set("x-school-id", school.id)
      .send({ email: "device@local", password: "Correct12345!" })
      .expect(200);
  });

  test("expired sessions do not count toward device limit", async () => {
    const school = await createSchool({ slug: "device-expired" });
    const { id: userId } = await insertUser({
      email: "device-expired@local",
      password: "Correct12345!",
      role: "school_admin",
      schoolId: school.id,
    });

    const { buildApp } = await import("../src/app.js");
    const app = buildApp();

    for (let i = 0; i < config.maxDevicesPerUser; i++) {
      await request(app)
        .post("/v1/auth/login")
        .set("User-Agent", `jest-exp-${i}`)
        .set("x-school-id", school.id)
        .send({ email: "device-expired@local", password: "Correct12345!" })
        .expect(200);
    }

    // expire 1 active session
    await expireSessionsForUser(userId, 1);

    const res = await request(app)
      .post("/v1/auth/login")
      .set("User-Agent", "jest-exp-new")
      .set("x-school-id", school.id)
      .send({ email: "device-expired@local", password: "Correct12345!" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("access_token");
    expect(res.body).toHaveProperty("refresh_token");
  });
});
