import { z } from "zod";

export const markClassSchema = z.object({
  school_id: z.string().uuid(),
  class_id: z.string().uuid(),
  academic_period_id: z.string().uuid(),
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  marked_by: z.string().uuid(),
  records: z.array(z.object({
    student_id: z.string().uuid(),
    status: z.enum(["present","absent","tardy","excused","half_day"]),
    late_minutes: z.number().int().min(0).optional(),
    remarks: z.string().max(500).optional(),
  })).min(1).max(100)
});
