import { getStudentGPA } from './controllers/GradeController.js';
import "express-async-errors";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { buildApp } from "./app.js";
import { redis } from "./redis.js";
import { eventBus, ensureEventBusConnected } from "./eventBus.js";

const app = buildApp();

async function start() {
  // Ensure deps are connected before exposing readiness.
  if (!redis.isOpen) {
    await redis.connect();
  }
  await ensureEventBusConnected();

  app.get('/grades/student/:studentId/period/:periodId/gpa', getStudentGPA);
app.listen(config.PORT, config.HOST, () => {
    logger.info({ host: config.HOST, port: config.PORT }, "academic_service_listening");
  });
}

start().catch((err) => {
  logger.fatal({ err }, "academic_service_failed_to_start");
  process.exit(1);
});

process.on("SIGTERM", async () => {
  try { if (redis.isOpen) await redis.quit(); } catch {}
  try { await eventBus.disconnect(); } catch {}
  process.exit(0);
});
