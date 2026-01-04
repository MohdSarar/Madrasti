import { buildApp } from "./app.js";
import { config } from "./config.js";
import { healthcheckDb } from "./db.js";
import { logger } from "./logger.js";

async function main() {
  await healthcheckDb();
  const app = buildApp();
  app.listen(config.port, () => {
    logger.info("auth service started", { port: config.port, env: config.nodeEnv });
  });
}

main().catch((err) => {
  logger.error("fatal", { err: String(err?.stack ?? err) });
  process.exit(1);
});
