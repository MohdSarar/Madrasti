import { z } from "zod";

export const generateReportSchema = z.object({
  school_id: z.string().uuid(),
  report_type: z.enum(["report_card","transcript","progress_report","attendance_report"]),
  template_id: z.string().uuid().optional(),
  student_id: z.string().uuid(),
  academic_period_id: z.string().uuid(),
  generated_by: z.string().uuid(),
});
