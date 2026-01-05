import { buildApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

const app = buildApp();

app.listen(config.port, () => {
  logger.info({ port: config.port }, "auth service listening");
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

process.on("unhandledRejection", (reason: unknown) => {
  const e = reason instanceof Error ? reason : new Error(String(reason));
  logger.error({ err: { message: e.message, stack: e.stack } }, "unhandledRejection");
});

process.on("uncaughtException", (err: Error) => {
  logger.error({ err: { message: err.message, stack: err.stack } }, "uncaughtException");
  process.exit(1);
});
