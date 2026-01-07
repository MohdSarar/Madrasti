import dotenv from "dotenv";

dotenv.config();

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function toBool(v: string | undefined): boolean {
  if (!v) return false;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export const config = {
  nodeEnv: process.env["NODE_ENV"] ?? "development",

  host: process.env["HOST"] ?? "0.0.0.0",
  port: parseInt(process.env["PORT"] ?? "8083", 10),

  databaseUrl: must("DATABASE_URL"),
  redisUrl: must("REDIS_URL"),

  authServiceUrl: must("AUTH_SERVICE_URL"),
  authServiceToken: must("AUTH_SERVICE_TOKEN"),

  maxBodyBytes: parseInt(process.env["MAX_BODY_BYTES"] ?? "1048576", 10),

  eventStream: process.env["EVENT_STREAM"] ?? "school-events",

  testBypassAuth: toBool(process.env["TEST_BYPASS_AUTH"]),
};
