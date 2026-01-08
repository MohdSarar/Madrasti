import { z } from "zod";

export const createGradeSchema = z.object({
  school_id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  student_id: z.string().uuid(),
  marks_obtained: z.number().min(0),
  marks_total: z.number().min(1),
  remarks: z.string().max(500).optional(),
}).refine((d) => d.marks_obtained <= d.marks_total, { message: "Marks obtained cannot exceed total marks" });

export const bulkGradesSchema = z.object({
  school_id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  grades: z.array(z.object({
    student_id: z.string().uuid(),
    marks_obtained: z.number().min(0),
  })).min(1).max(100),
});
