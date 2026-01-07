import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.string().default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().default(8085),
  DATABASE_URL: z.string().min(1),
  SECURITY_SERVICE_TOKEN: z.string().min(8),
  SERVICE_NAME: z.string().default("security"),
  APP_VERSION: z.string().default("dev"),
});

export const config = Env.parse({
  NODE_ENV: process.env.NODE_ENV,
  HOST: process.env.HOST,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  SECURITY_SERVICE_TOKEN: process.env.SECURITY_SERVICE_TOKEN,
  SERVICE_NAME: process.env.SERVICE_NAME,
  APP_VERSION: process.env.APP_VERSION,
});
