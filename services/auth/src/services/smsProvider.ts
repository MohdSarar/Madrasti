import { logger } from "../logger.js";

/**
 * SMS provider abstraction.
 * For MVP dev, we use a mock provider that logs the OTP.
 * Integrations (e.g., Twilio/local Egyptian SMS gateways) will be added later.
 */
export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

export class MockSmsProvider implements SmsProvider {
  sendOtp(phone: string, code: string): Promise<void> {
    logger.info({ phone, code }, "MOCK SMS OTP");
      return Promise.resolve();
    }
}

export function getSmsProvider(): SmsProvider {
  return new MockSmsProvider();
}
