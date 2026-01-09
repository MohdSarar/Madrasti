import { createClient } from "redis";
import { config } from "./config.js";
import { logger } from "./logger.js";

let client: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (client) return client;
  client = createClient({ url: config.redisUrl });
  client.on("error", (err) => logger.error({ err: String(err) }, "redis error"));

  await client.connect();
  return client;
}

export async function closeRedis(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } finally {
    client = null;
  }
}
