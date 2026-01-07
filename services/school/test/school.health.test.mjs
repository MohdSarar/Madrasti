import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

process.env.NODE_ENV = "test";
process.env.TEST_BYPASS_AUTH = "1";

process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/school_db";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.AUTH_SERVICE_URL ??= "http://localhost:8081";
process.env.AUTH_SERVICE_TOKEN ??= "dev-internal-token";
process.env.EVENT_BUS_REDIS_URL ??= process.env.REDIS_URL;

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function resetDb() {
  // keep schools minimal; provisioning tests would insert schools explicitly
  await db.query("TRUNCATE classes RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE grade_levels RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE academic_years RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE schools RESTART IDENTITY CASCADE");
}

test.before(async () => { await db.connect(); });
test.after(async () => { await db.end(); });
test.beforeEach(async () => { await resetDb(); });

test("GET /health returns ok", async () => {
  const { EventBus } = await import("@madrasti/event-bus");
  const { buildApp } = await import("../dist/app.js");

  const fakeRedis = {
    isOpen: true,
    connect: async () => {},
    quit: async () => {},
    xAdd: async () => {},
    xGroupCreate: async () => {},
    xReadGroup: async () => null,
    xAck: async () => {},
  };

  const bus = new EventBus({ pub: fakeRedis, sub: fakeRedis });

  const app = buildApp(bus);
  const server = app.listen(0);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { ok: true });

  server.close();
});
