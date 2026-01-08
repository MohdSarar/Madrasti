import pino from "pino";
import { config } from "./config.js";
export const logger = pino({ base: { service: config.SERVICE_NAME, version: config.APP_VERSION }, level: process.env.LOG_LEVEL ?? "info" });
