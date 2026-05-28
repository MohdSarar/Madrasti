import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgres://madrasti:madrasti@localhost:5432/madrasti";
process.env.SECURITY_SERVICE_TOKEN ??= "dev-security-token-minimum-8chars";

const skipIntegration = !process.env.DATABASE_URL;

test("GET /health returns ok", { skip: skipIntegration ? "DATABASE_URL not set" : false }, async () => {
  const { buildApp } = await import("../dist/app.js");
  const app = buildApp();
  const server = app.listen(0);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.ok, "Response should have ok: true");

  server.close();
});
