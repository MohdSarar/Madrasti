import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { buildApp } from "../../src/app.js";

test("health endpoint", async () => {
  const app = buildApp();
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});
