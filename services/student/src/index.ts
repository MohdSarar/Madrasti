import { config } from "./config.js";
import { logger } from "./logger.js";
import { redis } from "./redis.js";
import { pool } from "./db.js";
import { buildApp } from "./app.js";

async function main() {
  await redis.connect();

  const app = buildApp();

  const server = app.listen(config.port, config.host, () => {
    logger.info(
      { host: config.host, port: config.port },
      "student-service listening"
    );
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
