import { createClient } from "redis";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { randomToken } from "../utils/crypto.js";

type OtpRecord = {
  phone: string;
  code: string;
  expiresAt: number; // epoch ms
};

let client: ReturnType<typeof createClient> | null = null;

export async function getRedis() {
  if (client) return client;
  client = createClient({ url: config.redisUrl });
  client.on("error", (err) => logger.error({ err: String(err) }, "redis error"));

  await client.connect();
  return client;
}

export function generateOtpCode(): string {
  // 6 digits
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export async function storeOtp(phone: string, code: string): Promise<{ requestId: string }> {
  const redis = await getRedis();
  const requestId = randomToken(16);
  const key = `otp:${requestId}`;
  const record: OtpRecord = { phone, code, expiresAt: Date.now() + config.otpCodeTtlSeconds * 1000 };
  await redis.set(key, JSON.stringify(record), { EX: config.otpCodeTtlSeconds });
  return { requestId };
}

export async function verifyOtp(requestId: string, phone: string, code: string): Promise<boolean> {
  const redis = await getRedis();
  const key = `otp:${requestId}`;
  const raw = await redis.get(key);
  if (!raw) return false;
  const record = JSON.parse(raw) as OtpRecord;
  if (record.phone !== phone) return false;
  if (record.code !== code) return false;
  await redis.del(key); // one-time
  return true;
}
