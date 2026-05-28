import test from "node:test";
import assert from "node:assert/strict";

test("GradeCalculator: converts percentage to letter grade", () => {
  function toLetterGrade(pct) {
    if (pct >= 90) return "A";
    if (pct >= 80) return "B";
    if (pct >= 70) return "C";
    if (pct >= 60) return "D";
    return "F";
  }
  assert.equal(toLetterGrade(95), "A");
  assert.equal(toLetterGrade(82), "B");
  assert.equal(toLetterGrade(71), "C");
  assert.equal(toLetterGrade(63), "D");
  assert.equal(toLetterGrade(45), "F");
});
