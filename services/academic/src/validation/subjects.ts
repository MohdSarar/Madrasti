import { z } from "zod";

export const subjectCreateSchema = z.object({
  school_id: z.string().uuid(),
  code: z.string().min(1).max(20),
  name_ar: z.string().min(1).max(100),
  name_en: z.string().max(100).optional(),
  grade_level_id: z.string().uuid(),
  credits: z.number().min(0.1).max(9).optional(),
  pass_threshold: z.number().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
});

export const subjectUpdateSchema = subjectCreateSchema.partial().omit({ school_id: true });
