import { z } from "zod";

export const createLeaveSchema = z.object({
  school_id: z.string().uuid(),
  student_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  absence_reason_id: z.string().uuid().optional(),
  request_reason: z.string().min(1).max(2000),
  requested_by: z.string().uuid(),
});
