export type Grade = {
  id: string;
  subject_name: string;
  evaluation_name?: string | null;
  marks_obtained: number;
  marks_total: number;
  coefficient?: number | null;
  date?: string | null;
};

export type GradesSummary = {
  average?: number;
  rank?: number;
  total?: number;
  progress?: number;
};

export type CreateGradeInput = {
  subject_name: string;
  evaluation_name?: string;
  marks_obtained: number;
  marks_total: number;
  coefficient?: number;
  date?: string;
};
