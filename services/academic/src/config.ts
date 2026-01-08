import dotenv from "dotenv";
dotenv.config();

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  SERVICE_NAME: process.env.SERVICE_NAME ?? "academic",
  APP_VERSION: process.env.APP_VERSION ?? "dev",
  HOST: process.env.HOST ?? "0.0.0.0",
  PORT: Number(process.env.PORT ?? 8085),
  DATABASE_URL: must("DATABASE_URL"),
  REDIS_URL: must("REDIS_URL"),
  AUTH_SERVICE_URL: must("AUTH_SERVICE_URL"),
  AUTH_SERVICE_TOKEN: must("AUTH_SERVICE_TOKEN"),
};
