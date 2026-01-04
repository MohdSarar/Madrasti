import dotenv from "dotenv";

dotenv.config();

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "8081", 10),

  databaseUrl: must("DATABASE_URL"),
  redisUrl: must("REDIS_URL"),

  jwt: {
    accessSecret: must("JWT_ACCESS_SECRET"),
    refreshSecret: must("JWT_REFRESH_SECRET"),
    accessTtlSeconds: parseInt(process.env.JWT_ACCESS_TTL_SECONDS ?? "900", 10),
    refreshTtlSeconds: parseInt(process.env.JWT_REFRESH_TTL_SECONDS ?? "2592000", 10),
  },

  staff2faRequired: (process.env.STAFF_2FA_REQUIRED ?? "true").toLowerCase() === "true",

  maxDevicesPerUser: parseInt(process.env.MAX_DEVICES_PER_USER ?? "3", 10),
  sessionIdleTimeoutSeconds: parseInt(process.env.SESSION_IDLE_TIMEOUT_SECONDS ?? "7200", 10),

  otpCodeTtlSeconds: parseInt(process.env.OTP_CODE_TTL_SECONDS ?? "300", 10),
};
