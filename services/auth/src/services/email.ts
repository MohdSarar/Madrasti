import { logger } from "../logger.js";

/**
 * Email sending abstraction.
 * For MVP dev, we log the email content.
 * Later: integrate SendGrid/Mailgun/SES.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  logger.info("MOCK EMAIL", { to, subject, body });
}
