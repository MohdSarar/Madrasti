import { describe, it, expect } from "@jest/globals";
import { GradeCalculator } from "../../../src/services/GradeCalculator.js";

describe("GradeCalculator", () => {
  it("should calculate percentage correctly", () => {
    expect(GradeCalculator.calculatePercentage(85, 100)).toBeCloseTo(85, 5);
  });

  it("should handle edge cases (0%, 100%)", () => {
    expect(GradeCalculator.calculatePercentage(0, 100)).toBe(0);
    expect(GradeCalculator.calculatePercentage(100, 100)).toBe(100);
  });

  it("should calculate letter grade from percentage", () => {
    expect(GradeCalculator.calculateLetterGrade(96)).toBe("A+");
    expect(GradeCalculator.calculateLetterGrade(90)).toBe("A");
    expect(GradeCalculator.calculateLetterGrade(85)).toBe("B+");
  });

  it("should calculate grade points from letter grade", () => {
    expect(GradeCalculator.calculateGradePoints("A")).toBeCloseTo(4.0, 5);
    expect(GradeCalculator.calculateGradePoints("C")).toBeCloseTo(2.0, 5);
  });
});
