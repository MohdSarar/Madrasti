import request from "supertest";
import { buildApp } from "../src/app";

describe("Auth - refresh token validation", () => {
  test("refresh with invalid token returns INVALID_TOKEN", async () => {
    const app = buildApp();
    const res = await request(app).post("/v1/auth/refresh").send({ refresh_token: "not-a-jwt" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_TOKEN");
  });
});
