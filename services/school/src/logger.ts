import pino from "pino";
import { config } from "./config.js";

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? (config.nodeEnv === "production" ? "info" : "debug"),
  redact: { paths: ["req.headers.authorization"], remove: true },
});
