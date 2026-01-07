import { config } from "./config.js";
import { logger } from "./logger.js";
import { buildApp } from "./app.js";

const app = buildApp();
app.listen(config.PORT, config.HOST, () => {
  logger.info({ host: config.HOST, port: config.PORT }, "security_service_listening");
});
