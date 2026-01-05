// services/auth/src/logger.ts
import pino from "pino";

const level = process.env["LOG_LEVEL"] || "info";

// Si tu utilises pino-pretty en dev (optionnel)
const pretty =
  process.env["NODE_ENV"] !== "production" && process.env["LOG_PRETTY"] === "1";

const transport = pretty
  ? {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:standard", singleLine: true },
    }
  : undefined;

export const logger = pino({
  level,
  ...(transport ? { transport } : {}),
});
