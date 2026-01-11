export type Subject = {
  id: string;
  name: string;
  grade_level_id?: string | null;
};

export type GradeRow = {
  id: string;
  student_id: string;
  assessment_id: string;
  marks_obtained: number;
  marks_total: number;
  grade_letter?: string | null;
  grade_points?: number | null;
  remarks?: string | null;
  created_at?: string | null;

  // When joined with assessments
  subject_id?: string | null;
  academic_period_id?: string | null;
};
