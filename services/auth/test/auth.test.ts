import request from "supertest";
import { buildApp } from "../src/app.js";

describe("health", () => {
  it("should return ok", async () => {
    const app = buildApp();
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
