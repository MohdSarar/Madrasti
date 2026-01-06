import { config } from "./config.js";
import { logger } from "./logger.js";
import { redis } from "./redis.js";
import { pool } from "./db.js";
import { EventBus } from "@madrasti/event-bus";
import { buildApp } from "./app.js";

async function main() {
  await redis.connect();

  const eventBus = new EventBus(config.redisUrl);
  await eventBus.connect();

  const app = buildApp(eventBus);

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, "school-service listening");
  });

  const shutdown = async () => {
    logger.info("shutting down");
    server.close(() => void 0);
    await redis.quit();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  logger.error({ err: e }, "fatal");
  process.exit(1);
});
