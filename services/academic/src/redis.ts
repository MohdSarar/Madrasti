import { createClient } from "redis";
import { config } from "./config.js";

export const redis = createClient({ url: config.REDIS_URL });

export async function redisHealth(): Promise<boolean> {
  if (!redis.isOpen) await redis.connect();
  const pong = await redis.ping();
  return pong === "PONG";
}
