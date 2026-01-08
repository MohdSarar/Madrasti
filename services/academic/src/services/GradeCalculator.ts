export class GradeCalculator {
  static calculatePercentage(obtained: number, total: number): number {
    return Math.round((obtained / total) * 100 * 100) / 100;
  }

  static calculateLetterGrade(percentage: number): string {
    if (percentage >= 95) return "A+";
    if (percentage >= 90) return "A";
    if (percentage >= 85) return "B+";
    if (percentage >= 80) return "B";
    if (percentage >= 75) return "C+";
    if (percentage >= 70) return "C";
    if (percentage >= 65) return "D+";
    if (percentage >= 60) return "D";
    return "F";
  }

  static calculateGradePoints(letter: string): number {
    const scale: Record<string, number> = {
      "A+": 4.0, "A": 4.0, "B+": 3.5, "B": 3.0,
      "C+": 2.5, "C": 2.0, "D+": 1.5, "D": 1.0, "F": 0.0,
    };
    return scale[letter] ?? 0.0;
  }
}
