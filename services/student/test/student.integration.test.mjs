import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

process.env.NODE_ENV = "test";
process.env.TEST_BYPASS_AUTH = "1";

// Default local docker-compose mappings (override in CI as needed)
process.env.DATABASE_URL ??= "postgres://madrasti:madrasti@localhost:5432/madrasti";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.AUTH_SERVICE_URL ??= "http://localhost:8081";
process.env.AUTH_SERVICE_TOKEN ??= "dev-internal-token";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function resetDb() {
  await db.query("TRUNCATE student_parents RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE parents RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE students RESTART IDENTITY CASCADE");
}

test.before(async () => {
  await db.connect();
});

test.after(async () => {
  await db.end();
});

test.beforeEach(async () => {
  await resetDb();
});

test("GET /health returns ok", async () => {
  const { buildApp } = await import("../dist/app.js");
  const app = buildApp();
  const server = app.listen(0);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");

  server.close();
});

test("POST /api/v1/parents creates a parent (auth bypass)", async () => {
  const { buildApp } = await import("../dist/app.js");
  const app = buildApp();
  const server = app.listen(0);
  const port = server.address().port;

  const payload = {
    first_name_ar: "أحمد",
    last_name_ar: "أبو سرار",
    phone: "+201234567890",
    relationship_type: "father",
  };

  const res = await fetch(`http://127.0.0.1:${port}/api/v1/parents`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test" },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id);
  assert.equal(body.first_name_ar, payload.first_name_ar);

  server.close();
});
