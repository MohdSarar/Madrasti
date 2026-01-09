import { describe, it, expect, jest } from "@jest/globals";

jest.unstable_mockModule("../../src/db.js", () => ({
  pool: {
    query: jest.fn()
      // 1) select students to mark absent
      .mockResolvedValueOnce({ rows: [{ student_id: "s1", class_id: "c1" }] })
      // 2) insert attendance
      .mockResolvedValueOnce({ rows: [] })
      // 3) update summary
      .mockResolvedValueOnce({ rows: [] }),
  },
}));

jest.unstable_mockModule("../../src/eventBus.js", () => ({
  eventBus: {
    publish: jest.fn().mockResolvedValue(undefined),
  },
}));

const { runAutoMarkAbsent } = await import("../../src/jobs/autoMarkAbsent.js");
const { eventBus } = await import("../../src/eventBus.js");

describe("autoMarkAbsent job", () => {
  it("should publish student.absent event for each absent student", async () => {
    await runAutoMarkAbsent();
    expect((eventBus.publish as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
