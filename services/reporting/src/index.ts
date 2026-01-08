import "express-async-errors";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { buildApp } from "./app.js";
import { redis } from "./redis.js";
const app = buildApp();
app.listen(config.PORT, config.HOST, () => {
  logger.info({ host: config.HOST, port: config.PORT }, "reporting_service_listening");
});
process.on("SIGTERM", async () => {
  try { if (redis.isOpen) await redis.quit(); } catch {}
  process.exit(0);
});
