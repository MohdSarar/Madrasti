import { z } from "zod";

export const entrySchema = z.object({
  school_id: z.string().uuid(),
  timetable_id: z.string().uuid(),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid().optional(),
  day_of_week: z.number().int().min(1).max(7),
  time_slot_id: z.string().uuid(),
  room: z.string().max(50).optional(),
});
