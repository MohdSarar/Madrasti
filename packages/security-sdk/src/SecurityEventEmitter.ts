import type { SecurityEvent } from "./types.js";
import { SecurityClient } from "./SecurityClient.js";

/** Best-effort emitter: never blocks primary business flow. */
export class SecurityEventEmitter {
  constructor(private readonly client: SecurityClient) {}
  async emit(event: SecurityEvent): Promise<void> {
    try { await this.client.logEvent(event); } catch { /* swallow */ }
  }
}
