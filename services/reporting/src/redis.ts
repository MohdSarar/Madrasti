import { createClient } from "redis";
import { config } from "./config.js";

export const redis = createClient({ url: config.redisUrl });

redis.on("error", (err) => console.error("Redis error:", err));

(async () => {
  try {
    await redis.connect();
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
  }
})();

export async function redisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
