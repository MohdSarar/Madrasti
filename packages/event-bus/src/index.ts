import { createClient, type RedisClientType } from "redis";

export type DomainEvent<TPayload = unknown> = {
  type: string;
  payload: TPayload;
  timestamp: number;
  correlation_id?: string;
};

export class EventBus {
  private pub: RedisClientType;
  private sub: RedisClientType;

  constructor(redisUrl: string) {
    this.pub = createClient({ url: redisUrl });
    this.sub = createClient({ url: redisUrl });
  }

  async connect(): Promise<void> {
    await this.pub.connect();
    await this.sub.connect();
  }

  async publish(stream: string, event: DomainEvent): Promise<void> {
    // Redis Streams fields must be strings, so we store "" when missing.
    await this.pub.xAdd(stream, "*", {
      type: event.type,
      payload: JSON.stringify(event.payload),
      timestamp: String(event.timestamp),
      correlation_id: event.correlation_id ?? "",
    });
  }

  async subscribe(opts: {
    stream: string;
    group: string;
    consumer: string;
    handler: (event: DomainEvent) => Promise<void>;
    blockMs?: number;
  }): Promise<void> {
    const { stream, group, consumer, handler } = opts;

    try {
      await this.sub.xGroupCreate(stream, group, "0", { MKSTREAM: true });
    } catch {
      // group already exists
    }

    const blockMs = opts.blockMs ?? 5000;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const resp = await this.sub.xReadGroup(
        group,
        consumer,
        [{ key: stream, id: ">" }],
        { COUNT: 10, BLOCK: blockMs }
      );

      if (!resp || resp.length === 0) continue;

      for (const streamResp of resp) {
        for (const message of streamResp.messages) {
          const rawCorrelation = String(message.message.correlation_id ?? "").trim();
          const correlation_id = rawCorrelation.length > 0 ? rawCorrelation : undefined;

          const base: Omit<DomainEvent, "correlation_id"> = {
            type: String(message.message.type),
            payload: JSON.parse(String(message.message.payload)),
            timestamp: parseInt(String(message.message.timestamp), 10),
          };

          // IMPORTANT for exactOptionalPropertyTypes:
          // don't set correlation_id at all when undefined
          const evt: DomainEvent = correlation_id
            ? { ...base, correlation_id }
            : base;

          await handler(evt);
          await this.sub.xAck(stream, group, message.id);
        }
      }
    }
  }
}
