import test from "node:test";
import assert from "node:assert/strict";

test("PermissionService: owner always has access", () => {
  function canAccess(doc, userId) {
    if (doc.owner_id === userId) return true;
    return doc.shared_with?.includes(userId) ?? false;
  }
  const doc = { owner_id: "u1", shared_with: ["u2"] };
  assert.ok(canAccess(doc, "u1"));
  assert.ok(canAccess(doc, "u2"));
  assert.equal(canAccess(doc, "u3"), false);
});
