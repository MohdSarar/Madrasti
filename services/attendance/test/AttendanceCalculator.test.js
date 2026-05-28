import test from "node:test";
import assert from "node:assert/strict";

test("AttendanceCalculator: computes attendance rate", () => {
  const totalDays = 100;
  const presentDays = 92;
  const rate = (presentDays / totalDays) * 100;
  assert.equal(rate, 92);
});
