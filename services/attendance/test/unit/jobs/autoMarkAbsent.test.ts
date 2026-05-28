import { describe, it, expect, jest } from "@jest/globals";

jest.unstable_mockModule("../../../src/config.js", () => ({
  config: {
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    AUTH_SERVICE_URL: "http://auth:8081",
    AUTH_SERVICE_TOKEN: "test-token",
    HOST: "0.0.0.0",
    PORT: 8086,
    SERVICE_NAME: "attendance",
    APP_VERSION: "test",
  },
}));

jest.unstable_mockModule("../../../src/db.js", () => ({
  pool: {
    query: jest.fn()
      // 1) get active students
      .mockResolvedValueOnce({ rows: [{ id: "s1", school_id: "sch1", current_class_id: "c1", full_name_ar: "طالب" }] })
      // 2) already-marked students today
      .mockResolvedValueOnce({ rows: [] })
      // 3) bulk insert absent records
      .mockResolvedValueOnce({ rows: [] })
      // 4) get current academic period (per student)
      .mockResolvedValueOnce({ rows: [{ id: "period-1" }] })
      // 5) count attendance for summary
      .mockResolvedValueOnce({ rows: [{ total_days: "1", present_days: "0", absent_days: "1", tardy_days: "0", excused_days: "0" }] })
      // 6) upsert attendance summary
      .mockResolvedValueOnce({ rows: [] }),
  },
}));

jest.unstable_mockModule("../../../src/eventBus.js", () => ({
  eventBus: {
    publish: jest.fn().mockResolvedValue(undefined),
  },
}));

const { autoMarkAbsent } = await import("../../../src/jobs/autoMarkAbsent.js");
const { eventBus } = await import("../../../src/eventBus.js");

describe("autoMarkAbsent job", () => {
  it("should publish student.absent event for each absent student", async () => {
    await autoMarkAbsent();
    expect((eventBus.publish as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
