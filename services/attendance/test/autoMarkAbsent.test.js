import test from "node:test";
import assert from "node:assert/strict";

test("autoMarkAbsent: filters students not yet marked", () => {
  const allStudents = ["s1", "s2", "s3", "s4"];
  const alreadyMarked = new Set(["s1", "s3"]);
  const toMark = allStudents.filter((id) => !alreadyMarked.has(id));
  assert.deepEqual(toMark, ["s2", "s4"]);
});
