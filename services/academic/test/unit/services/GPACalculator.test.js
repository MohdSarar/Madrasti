import { describe, it, expect, jest } from "@jest/globals";
// Mock db + redis to keep unit tests deterministic
jest.unstable_mockModule("../../src/db.js", () => ({
    pool: { query: jest.fn().mockResolvedValue({ rows: [] }) },
}));
jest.unstable_mockModule("../../src/redis.js", () => ({
    redis: {
        get: jest.fn().mockResolvedValue(null),
        setEx: jest.fn().mockResolvedValue("OK"),
        del: jest.fn().mockResolvedValue(1),
    },
}));
const { GPACalculator } = await import("../../src/services/GPACalculator.js");
describe("GPACalculator", () => {
    it("should return 0 for student with no grades", async () => {
        const result = await GPACalculator.calculateGPA("00000000-0000-0000-0000-000000000000", "period-1");
        expect(result.gpa).toBe(0);
    });
    it("should convert percentage to correct grade points (4.0 scale)", () => {
        expect(GPACalculator.percentageToGradePoints(95)).toBeCloseTo(4.0, 2);
        expect(GPACalculator.percentageToGradePoints(50)).toBeLessThan(3.0);
    });
});
