import { buildApp } from "./app.js";
import { config } from "./config.js";
import { healthcheckDb } from "./db.js";
import { logger } from "./logger.js";

async function main() {
  await healthcheckDb();
  const app = buildApp();
  app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, "auth service started");
  });
}

main().catch((err) => {
  logger.error({ err: String(err?.stack ?? err) }, "fatal");
  process.exit(1);
});
