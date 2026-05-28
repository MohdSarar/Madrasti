import test from "node:test";
import assert from "node:assert/strict";

test("WeeklyViewGenerator: groups slots by day", () => {
  const slots = [
    { day: "monday", period: 1 },
    { day: "tuesday", period: 2 },
    { day: "monday", period: 3 },
  ];
  const grouped = slots.reduce((acc, s) => {
    (acc[s.day] ??= []).push(s);
    return acc;
  }, {});
  assert.equal(grouped.monday.length, 2);
  assert.equal(grouped.tuesday.length, 1);
});
