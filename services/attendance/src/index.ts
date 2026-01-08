import "express-async-errors";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { buildApp } from "./app.js";
import { redis } from "./redis.js";
import cron from "node-cron";
import { autoMarkAbsent } from "./jobs/autoMarkAbsent.js";
import { eventBus, ensureEventBusConnected } from "./eventBus.js";
const app = buildApp();
async function start() {
  // Ensure dependencies
  if (!redis.isOpen) {
    await redis.connect();
  }
  await ensureEventBusConnected();

  // Run every day at 11:00 (server local time)
  cron.schedule("0 11 * * *", async () => {
    logger.info("auto_mark_absent_job_start");
    try {
      await autoMarkAbsent();
    } catch (error) {
      logger.error({ error }, "auto_mark_absent_job_failed");
    }
  });

  app.listen(config.PORT, config.HOST, () => {
    logger.info({ host: config.HOST, port: config.PORT }, "attendance_service_listening");
  });
}

start().catch((error) => {
  logger.fatal({ error }, "attendance_service_boot_failed");
  process.exit(1);
});
process.on("SIGTERM", async () => {
  try { await eventBus.disconnect(); } catch {}
  try { if (redis.isOpen) await redis.quit(); } catch {}
  process.exit(0);
});
