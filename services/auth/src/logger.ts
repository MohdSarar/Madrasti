// services/auth/src/logger.ts
import pino from "pino";

const level = process.env.LOG_LEVEL || "info";

// Si tu utilises pino-pretty en dev (optionnel)
const transport =
  process.env.NODE_ENV !== "production" && process.env.LOG_PRETTY === "1"
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard", singleLine: false },
      }
    : undefined;

export const logger = pino({
  level,
  transport,
});
