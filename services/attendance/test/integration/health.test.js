import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

const skipIntegration = !process.env["DATABASE_URL"];

test("health endpoint returns 200 or 503", { skip: skipIntegration ? "DATABASE_URL not set" : false }, async () => {
  const { buildApp } = await import("../../dist/app.js");
  const app = buildApp();
  const res = await request(app).get("/health");
  assert.ok(res.status === 200 || res.status === 503, `Expected 200 or 503, got ${res.status}`);
  assert.ok(res.body.status, "Response should have a status field");
});
