import { buildApp } from "./app.js";
import { logger } from "./logger.js";
import { config } from "./config.js";
import { EventBus } from "@madrasti/event-bus";

// Si ton EventBus se construit différemment, adapte uniquement cette partie.
function createEventBus(): EventBus {
  // ⚠️ Ajuste si ton package expose une factory (ex: createEventBus()).
  return new EventBus({
    redisUrl: config.redisUrl,
    stream: config.eventStream,
    serviceName: "school-service",
  } as any);
}

async function safeCloseEventBus(bus: EventBus): Promise<void> {
  const anyBus = bus as any;

  // Essaye plusieurs noms possibles sans casser TypeScript
  if (typeof anyBus.stop === "function") {
    await anyBus.stop();
    return;
  }
  if (typeof anyBus.shutdown === "function") {
    await anyBus.shutdown();
    return;
  }
  if (typeof anyBus.disconnect === "function") {
    await anyBus.disconnect();
    return;
  }
  if (typeof anyBus.close === "function") {
    await anyBus.close();
    return;
  }
}

async function main() {
  const eventBus = createEventBus();
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
        await safeCloseEventBus(eventBus);
      } catch (err) {
        logger.error({ err }, "failed to close event bus");
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
