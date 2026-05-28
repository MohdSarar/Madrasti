import test from "node:test";
import assert from "node:assert/strict";

import { requireRole } from "../dist/middleware/requireRole.js";
import { requireTenant } from "../dist/middleware/requireTenant.js";
import { requirePermission } from "../dist/middleware/requirePermission.js";
import { authenticate } from "../dist/middleware/authenticate.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

test("requireRole: rejects when auth missing", async () => {
  const req = { auth: undefined };
  const res = mockRes();
  let nextCalled = false;
  await requireRole({ roles: ["school_admin"] })(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, "AUTH_MISSING");
});

test("requireTenant: rejects when school_id missing", async () => {
  const req = { auth: { sub: "u1", email: null, role: "school_admin", school_id: null, permissions: [] } };
  const res = mockRes();
  let nextCalled = false;
  await requireTenant()(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "TENANT_MISSING");
});

test("requirePermission: allows wildcard permission", async () => {
  const req = { auth: { sub: "u1", email: null, role: "school_admin", school_id: "s1", permissions: ["*"] } };
  const res = mockRes();
  let nextCalled = false;
  await requirePermission({ permissions: ["students:write"] })(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("authenticate: rejects when no Authorization header", async () => {
  const mw = authenticate({ authServiceUrl: "http://auth", serviceToken: "token" });
  const req = { headers: {} };
  const res = mockRes();
  let nextCalled = false;
  await mw(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, "AUTH_MISSING");
});

test("authenticate: accepts cached auth context", async () => {
  const redis = {
    get: async () =>
      JSON.stringify({ sub: "u1", email: "a@b.com", role: "school_admin", school_id: "s1", permissions: ["*"] }),
    setEx: async () => {},
  };

  const mw = authenticate({ authServiceUrl: "http://auth", serviceToken: "token", redis });
  const req = { headers: { authorization: "Bearer testtoken" } };
  const res = mockRes();
  let nextCalled = false;

  await mw(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.ok(req.auth);
  assert.equal(req.auth.sub, "u1");
});
