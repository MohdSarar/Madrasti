import { describe, it, expect, jest } from "@jest/globals";

jest.unstable_mockModule("../../src/db.js", () => ({
  pool: {
    query: jest.fn().mockResolvedValue({
      rows: [
        { day_of_week: 1, start_time: "08:00", end_time: "09:00", period_name: "P1", subject_name: "Math", room: "101", teacher_id: "t1" },
      ],
    }),
  },
}));

const { WeeklyViewGenerator } = await import("../../src/services/WeeklyViewGenerator.js");

describe("WeeklyViewGenerator", () => {
  it("should group entries by day of week", async () => {
    const weekly = await WeeklyViewGenerator.generateWeeklyView("teacher", "t1", "tt1");
    expect(weekly.monday.length).toBe(1);
    expect(weekly.monday[0].subject).toBe("Math");
  });
});
