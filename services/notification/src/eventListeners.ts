import { pool } from "./db.js";
import { logger } from "./logger.js";
import { eventBus } from "./eventBus.js";
import { NotificationService } from "./services/NotificationService.js";

export async function setupEventListeners(): Promise<void> {
  await eventBus.createConsumerGroup("academic-events", "notification-service");
  await eventBus.createConsumerGroup("attendance-events", "notification-service");

  // Academic events
  eventBus.consume({
    stream: "academic-events",
    group: "notification-service",
    consumer: "notification-1",
    handler: async (event) => {
      if (event.type !== "grade.updated") return;

      // Find primary parent for student
      const parentResult = await pool.query(
        `
        SELECT u.id as user_id,
               s.full_name_ar as student_name,
               COALESCE(sub.name_ar, sub.name_en) as subject_name
        FROM students s
        JOIN student_parents sp ON s.id = sp.student_id
        JOIN parents p ON sp.parent_id = p.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN assessments a ON a.id = $2
        LEFT JOIN subjects sub ON sub.id = a.subject_id
        WHERE s.id = $1 AND sp.is_primary = true
        LIMIT 1
        `,
        [(event.payload as any).student_id, (event.payload as any).assessment_id]
      );

      if (!parentResult.rows.length) return;

      const parent = parentResult.rows[0];

      await NotificationService.send({
        recipient_id: parent.user_id,
        notification_type: "grade_published",
        channels: ["email", "push", "in_app"],
        data: {
          student_name: parent.student_name,
          subject: parent.subject_name ?? "",
          marks: (event.payload as any).marks_obtained != null ? String((event.payload as any).marks_obtained) : "",
          percentage: (event.payload as any).percentage,
          school_id: (event.payload as any).school_id,
        },
      });
    },
  });

  // Attendance events
  eventBus.consume({
    stream: "attendance-events",
    group: "notification-service",
    consumer: "notification-1",
    handler: async (event) => {
      if (event.type !== "student.absent") return;

      const parentResult = await pool.query(
        `
        SELECT u.id as user_id,
               s.full_name_ar as student_name
        FROM students s
        JOIN student_parents sp ON s.id = sp.student_id
        JOIN parents p ON sp.parent_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE s.id = $1 AND sp.is_primary = true
        LIMIT 1
        `,
        [(event.payload as any).student_id]
      );

      if (!parentResult.rows.length) return;

      const parent = parentResult.rows[0];

      await NotificationService.send({
        recipient_id: parent.user_id,
        notification_type: "absence_alert",
        channels: ["sms", "push", "in_app"],
        data: {
          student_name: parent.student_name,
          date: (event.payload as any).date,
          school_id: (event.payload as any).school_id,
        },
        priority: "high",
      });
    },
  });

  logger.info("notification_event_listeners_configured");
}
