import "express-async-errors";
import { buildApp } from "./app.js";
import { logger } from "./logger.js";
import { config } from "./config.js";
import { EventBus } from "@madrasti/event-bus";

async function main() {
  const eventBus = new EventBus(config.redisUrl);
  await eventBus.connect();
  const app = buildApp(eventBus);

  const server = app.listen(config.port, config.host, () => {
    logger.info(
      { host: config.host, port: config.port },
      "school service listening"
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutdown requested");
    server.close(async () => {
      try {
        await eventBus.disconnect();
      } catch (err) {
        logger.error({ err }, "failed to disconnect event bus");
      } finally {
        process.exit(0);
      }
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "fatal error");
  process.exit(1);
});
