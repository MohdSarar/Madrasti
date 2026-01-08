import { EventBus } from "@madrasti/event-bus";
import { config } from "./config.js";

// Shared EventBus instance (Redis Streams)
export const eventBus = new EventBus(config.REDIS_URL);

export async function ensureEventBusConnected(): Promise<void> {
  await eventBus.connect();
}
