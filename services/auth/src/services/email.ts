import { logger } from "../logger.js";

/**
 * Email sending abstraction.
 * For MVP dev, we log the email content.
 * Later: integrate SendGrid/Mailgun/SES.
 */
export function sendEmail(to: string, subject: string, body: string): Promise<void> {
  logger.info({ to, subject, body }, "MOCK EMAIL");

  return Promise.resolve();
}
