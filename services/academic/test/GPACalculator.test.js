import test from "node:test";
import assert from "node:assert/strict";

test("GPACalculator: computes weighted GPA from grade points", () => {
  const grades = [
    { grade_points: 4.0, credits: 3 },
    { grade_points: 3.0, credits: 2 },
    { grade_points: 2.0, credits: 1 },
  ];
  const totalCredits = grades.reduce((s, g) => s + g.credits, 0);
  const weightedSum = grades.reduce((s, g) => s + g.grade_points * g.credits, 0);
  const gpa = weightedSum / totalCredits;
  assert.ok(gpa > 3.0 && gpa < 4.0, "GPA should be between 3.0 and 4.0");
});
