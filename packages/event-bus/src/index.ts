import { createClient, type RedisClientType } from "redis";

export type DomainEvent<TPayload = unknown> = {
  type: string;
  payload: TPayload;
  timestamp: number;
  correlation_id?: string;
};

export type EventBusDeps = {
  pub: RedisClientType;
  sub: RedisClientType;
};

export class EventBus {
  private pub: RedisClientType;
  private sub: RedisClientType;

  /**
   * Create an EventBus connected to Redis Streams.
   * In production you should pass a redisUrl.
   * In tests you can inject pre-created clients using { pub, sub }.
   */
  constructor(arg: string | EventBusDeps) {
    if (typeof arg === "string") {
      this.pub = createClient({ url: arg });
      this.sub = createClient({ url: arg });
    } else {
      this.pub = arg.pub;
      this.sub = arg.sub;
    }
  }

  async connect() {
    if (!this.pub.isOpen) await this.pub.connect();
    if (!this.sub.isOpen) await this.sub.connect();
  }

  async disconnect() {
    if (this.pub.isOpen) await this.pub.quit();
    if (this.sub.isOpen) await this.sub.quit();
  }

  async publish<T>(stream: string, event: DomainEvent<T>) {
    await this.pub.xAdd(stream, "*", {
      type: event.type,
      payload: JSON.stringify(event.payload ?? null),
      timestamp: String(event.timestamp),
      correlation_id: event.correlation_id ?? "",
    });
  }

  async createConsumerGroup(stream: string, group: string) {
    try {
      await this.sub.xGroupCreate(stream, group, "0", { MKSTREAM: true });
    } catch (err: any) {
      // BUSYGROUP = group exists, safe to ignore
      if (!String(err?.message ?? "").includes("BUSYGROUP")) throw err;
    }
  }

  async consume<T>(params: {
    stream: string;
    group: string;
    consumer: string;
    count?: number;
    blockMs?: number;
    handler: (event: DomainEvent<T>, ack: () => Promise<void>) => Promise<void>;
  }) {
    const count = params.count ?? 10;
    const blockMs = params.blockMs ?? 5000;

    const res = await this.sub.xReadGroup(
      params.group,
      params.consumer,
      { key: params.stream, id: ">" },
      { COUNT: count, BLOCK: blockMs }
    );

    if (!res) return;

    for (const streamResp of res) {
      for (const msg of streamResp.messages) {
        const fields = msg.message as any;

        const event: DomainEvent<T> = {
          type: fields.type,
          payload: fields.payload ? JSON.parse(fields.payload) : (null as any),
          timestamp: Number(fields.timestamp),
          correlation_id: fields.correlation_id || undefined,
        };

        const ack = async () => {
          await this.sub.xAck(params.stream, params.group, msg.id);
        };

        await params.handler(event, ack);
      }
    }
  }
}
