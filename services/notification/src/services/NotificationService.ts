import { pool } from "../db.js";
import { logger } from "../logger.js";
import { eventBus } from "../eventBus.js";

export type NotificationChannel = "email" | "sms" | "push" | "in_app";
export type NotificationPriority = "high" | "normal" | "low";

interface SendNotificationParams {
  recipient_id: string;
  notification_type: string;
  channels: NotificationChannel[];
  data: Record<string, any>;
  priority?: NotificationPriority;
}

type PrefRow = {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
};

type TemplateRow = {
  subject_template: string | null;
  body_template: string | null;
};

export class NotificationService {
  /**
   * Send notification via multiple channels.
   * For external channels (email/sms/push) this implementation logs only (provider integration TBD).
   */
  static async send(params: SendNotificationParams): Promise<void> {
    const { recipient_id, notification_type, channels, data, priority = "normal" } = params;

    const prefs = await this.getPreferences(recipient_id);

    if (priority !== "high" && this.isQuietHours(prefs)) {
      logger.info({ recipient_id, notification_type }, "notification_skipped_quiet_hours");
      return;
    }

    const template = await this.getTemplate(notification_type, data.language ?? "ar");
    if (!template) {
      logger.error({ notification_type }, "notification_template_not_found");
      return;
    }

    const rendered = this.renderTemplate(template, data);

    for (const channel of channels) {
      if (!this.isChannelEnabled(prefs, channel)) continue;

      // Save first (in_app relies on this record)
      const notification = await this.saveNotification({
        school_id: data.school_id,
        notification_type,
        channel,
        recipient_id,
        subject: rendered.subject,
        body: rendered.body,
        data,
        priority,
      });

      try {
        switch (channel) {
          case "email":
            await this.sendEmail(recipient_id, rendered.subject, rendered.body);
            break;
          case "sms":
            await this.sendSMS(recipient_id, rendered.body);
            break;
          case "push":
            await this.sendPush(recipient_id, rendered.subject, rendered.body);
            break;
          case "in_app":
            await this.sendWebSocket(recipient_id, notification);
            break;
        }

        await this.updateStatus(notification.id, "sent");
      } catch (error) {
        logger.error({ error, channel, notification_id: notification.id }, "notification_send_failed");
        await this.updateStatus(notification.id, "failed", (error as Error).message);
      }
    }
  }

  private static async getPreferences(userId: string): Promise<PrefRow> {
    const result = await pool.query<PrefRow>(
      "SELECT * FROM notification_preferences WHERE user_id = $1",
      [userId]
    );

    return (
      result.rows[0] ?? {
        email_enabled: true,
        sms_enabled: true,
        push_enabled: true,
        in_app_enabled: true,
      }
    );
  }

  private static isChannelEnabled(prefs: PrefRow, channel: NotificationChannel): boolean {
    const key = `${channel}_enabled` as const;
    const v = (prefs as any)[key];
    return v !== false;
  }

  private static isQuietHours(prefs: PrefRow): boolean {
    if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = prefs.quiet_hours_start.split(":").map(Number);
    const [endH, endM] = prefs.quiet_hours_end.split(":").map(Number);

    const startTime = (startH ?? 0) * 60 + (startM ?? 0);
    const endTime = (endH ?? 0) * 60 + (endM ?? 0);

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    }

    // crosses midnight
    return currentTime >= startTime || currentTime <= endTime;
  }

  private static async getTemplate(type: string, language: string): Promise<TemplateRow | null> {
    const result = await pool.query<TemplateRow>(
      "SELECT subject_template, body_template FROM notification_templates WHERE template_key = $1 AND language = $2 AND is_active = true",
      [type, language]
    );
    return result.rows[0] ?? null;
  }

  private static renderTemplate(template: TemplateRow, data: Record<string, any>): { subject: string; body: string } {
    let subject = template.subject_template ?? "";
    let body = template.body_template ?? "";

    for (const key of Object.keys(data)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, String(data[key]));
      body = body.replace(regex, String(data[key]));
    }

    return { subject, body };
  }

  private static async saveNotification(payload: {
    school_id: string;
    notification_type: string;
    channel: NotificationChannel;
    recipient_id: string;
    subject: string;
    body: string;
    data: Record<string, any>;
    priority: NotificationPriority;
  }): Promise<any> {
    const result = await pool.query(
      `
      INSERT INTO notifications (school_id, notification_type, channel, recipient_id, subject, body, data, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        payload.school_id,
        payload.notification_type,
        payload.channel,
        payload.recipient_id,
        payload.subject,
        payload.body,
        JSON.stringify(payload.data),
        payload.priority,
      ]
    );

    return result.rows[0];
  }

  private static async updateStatus(id: string, status: string, reason?: string): Promise<void> {
    await pool.query(
      "UPDATE notifications SET status = $1, failed_reason = $2, sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END WHERE id = $3",
      [status, reason ?? null, id]
    );
  }

  private static async sendEmail(recipientId: string, subject: string, body: string): Promise<void> {
    const userResult = await pool.query<{ email: string }>("SELECT email FROM users WHERE id = $1", [
      recipientId,
    ]);
    if (!userResult.rows.length) throw new Error("USER_NOT_FOUND");

    if (!userResult.rows[0]) throw new Error("USER_NOT_FOUND"); const email = userResult.rows[0].email; 
    logger.info({ to: email, subject, preview: body.substring(0, 80) }, "email_notification_provider_tbd");
  }

  private static async sendSMS(recipientId: string, message: string): Promise<void> {
    const userResult = await pool.query<{ phone: string }>("SELECT phone FROM users WHERE id = $1", [
      recipientId,
    ]);
    if (!userResult.rows.length) throw new Error("USER_NOT_FOUND");

    if (!userResult.rows[0]) throw new Error("USER_NOT_FOUND"); const phone = userResult.rows[0].phone; 
    logger.info({ to: phone, preview: message.substring(0, 80) }, "sms_notification_provider_tbd");
  }

  private static async sendPush(recipientId: string, title: string, body: string): Promise<void> {
    logger.info({ recipientId, title, preview: body.substring(0, 80) }, "push_notification_provider_tbd");
  }

  private static async sendWebSocket(recipientId: string, notification: any): Promise<void> {
    await eventBus.publish("websocket-events", {
      type: "notification.new",
      payload: { recipient_id: recipientId, notification },
      timestamp: Date.now(),
    });
  }
}
