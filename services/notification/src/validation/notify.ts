import { z } from "zod";

export const createNotificationSchema = z.object({
  school_id: z.string().uuid(),
  notification_type: z.string().min(1).max(100),
  channel: z.enum(["email","sms","push","in_app"]),
  recipient_id: z.string().uuid(),
  subject: z.string().max(300).optional(),
  body: z.string().min(1).max(5000),
  data: z.record(z.any()).optional(),
  priority: z.enum(["high","normal","low"]).optional(),
});
