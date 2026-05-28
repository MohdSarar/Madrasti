import "express-async-errors";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { buildApp } from "./app.js";
import { redis } from "./redis.js";
import { ensureEventBusConnected, eventBus } from "./eventBus.js";
import { setupEventListeners } from "./eventListeners.js";
const app = buildApp();

async function start() {
  await redis.connect();
  await ensureEventBusConnected();

  await setupEventListeners();
  logger.info("notification_listeners_configured");

  app.listen(config.PORT, config.HOST, () => {
    logger.info({ host: config.HOST, port: config.PORT }, "notification_service_listening");
  });
}

start().catch((err) => {
  logger.fatal({ err }, "notification_start_failed");
  process.exit(1);
});
process.on("SIGTERM", async () => {
  try { if (redis.isOpen) await redis.quit(); } catch {}
  try { await eventBus.disconnect(); } catch {}
  process.exit(0);
});
