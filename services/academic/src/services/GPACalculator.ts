import { pool } from "../db.js";
import { redis } from "../redis.js";

export type GPAResult = { gpa: number; cgpa: number; rank: number };

type GradeRow = {
  percentage: number;
  weight: number | null;
  subject_id: string;
  credits: string | number | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class GPACalculator {
  /**
   * Calculate GPA for a student in a specific academic period.
   * Uses Redis cache (1 hour TTL) and persists result into student_gpa_cache.
   */
  static async calculateGPA(studentId: string, periodId: string): Promise<GPAResult> {
    const cacheKey = `gpa:${studentId}:${periodId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as GPAResult;
      } catch {
        // ignore parse error and recompute
      }
    }

    const gradesResult = await pool.query<GradeRow>(
      `
      SELECT g.percentage,
             g.weight,
             a.subject_id,
             s.credits
      FROM grades g
      JOIN assessments a ON g.assessment_id = a.id
      JOIN subjects s ON a.subject_id = s.id
      WHERE g.student_id = $1
        AND a.academic_period_id = $2
        AND g.status = 'final'
      `,
      [studentId, periodId]
    );

    const grades = gradesResult.rows;
    if (!grades.length) {
      const empty: GPAResult = { gpa: 0, cgpa: 0, rank: 0 };
      await redis.setEx(cacheKey, 3600, JSON.stringify(empty));
      return empty;
    }

    // Group by subject: weighted average per subject, then credit-weighted GPA.
    const subjectGrades = new Map<
      string,
      { totalWeighted: number; totalWeight: number; credits: number }
    >();

    for (const grade of grades) {
      const subjectId = grade.subject_id;
      if (!subjectGrades.has(subjectId)) {
        const credits = grade.credits == null ? 1 : Number(grade.credits);
        subjectGrades.set(subjectId, {
          totalWeighted: 0,
          totalWeight: 0,
          credits: Number.isFinite(credits) && credits > 0 ? credits : 1,
        });
      }

      const subj = subjectGrades.get(subjectId)!;
      const weight = grade.weight == null ? 1 : Number(grade.weight);
      const safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 1;

      subj.totalWeighted += Number(grade.percentage) * safeWeight;
      subj.totalWeight += safeWeight;
    }

    let totalWeightedPoints = 0;
    let totalCredits = 0;

    for (const [, data] of subjectGrades) {
      const subjectAverage = data.totalWeight > 0 ? data.totalWeighted / data.totalWeight : 0;
      const gradePoints = this.percentageToGradePoints(subjectAverage);
      totalWeightedPoints += gradePoints * data.credits;
      totalCredits += data.credits;
    }

    const gpa = totalCredits > 0 ? round2(totalWeightedPoints / totalCredits) : 0;

    const rank = await this.calculateRank(studentId, periodId, gpa);
    const cgpa = await this.calculateCumulativeGPA(studentId);

    const result: GPAResult = { gpa, cgpa, rank };

    await redis.setEx(cacheKey, 3600, JSON.stringify(result));

    // Persist in cache table for analytics/reporting.
    await pool.query(
      `
      INSERT INTO student_gpa_cache (student_id, academic_period_id, gpa, cgpa, rank_in_class, calculated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (student_id, academic_period_id)
      DO UPDATE SET
        gpa = EXCLUDED.gpa,
        cgpa = EXCLUDED.cgpa,
        rank_in_class = EXCLUDED.rank_in_class,
        calculated_at = NOW()
      `,
      [studentId, periodId, gpa, cgpa, rank]
    );

    return result;
  }

  /**
   * Calculate rank in class for a student.
   * Rank = number of students in same class with higher GPA + 1.
   */
  static async calculateRank(studentId: string, periodId: string, gpa: number): Promise<number> {
    const studentResult = await pool.query<{ current_class_id: string | null }>(
      "SELECT current_class_id FROM students WHERE id = $1",
      [studentId]
    );

    if (!studentResult.rows.length) return 0;

    const student = studentResult.rows[0]; if (!student) return 0; const classId = student.current_class_id;
    if (!classId) return 0;

    const rankResult = await pool.query<{ rank: string }>(
      `
      SELECT COUNT(*) + 1 as rank
      FROM student_gpa_cache sgc
      JOIN students s ON sgc.student_id = s.id
      WHERE s.current_class_id = $1
        AND sgc.academic_period_id = $2
        AND sgc.gpa > $3
      `,
      [classId, periodId, gpa]
    );

    return rankResult.rows[0]?.rank ? Number(rankResult.rows[0].rank) : 0;
  }

  /**
    return rankResult.rows[0]?.rank ? Number(rankResult.rows[0].rank) : 0;
   * Note: uses AVG(gpa) across cached periods.
   */
  static async calculateCumulativeGPA(studentId: string): Promise<number> {
    const result = await pool.query<{ cgpa: string | null }>(
      `
      SELECT AVG(gpa) as cgpa
      FROM student_gpa_cache
      WHERE student_id = $1
      `,
      [studentId]
    );

    const cgpa = result.rows[0]?.cgpa ? Number(result.rows[0].cgpa) : 0;
    return Number.isFinite(cgpa) ? round2(cgpa) : 0;
  }

  /**
   * Convert percentage to grade points (4.0 scale).
   */
  static percentageToGradePoints(percentage: number): number {
    if (percentage >= 90) return 4.0;
    if (percentage >= 85) return 3.5;
    if (percentage >= 80) return 3.0;
    if (percentage >= 75) return 2.5;
    if (percentage >= 70) return 2.0;
    if (percentage >= 65) return 1.5;
    if (percentage >= 60) return 1.0;
    return 0.0;
  }

  /**
   * Invalidate GPA cache when grades change.
   */
  static async invalidateCache(studentId: string, periodId: string): Promise<void> {
    const cacheKey = `gpa:${studentId}:${periodId}`;
    await redis.del(cacheKey);
  }
}
