import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { RedisService } from "../redis/redis.service";

export const QUEUE_NAMES = {
  EMAIL: "email",
  NOTIFICATION: "notification",
  REPORT: "report",
  CLEANUP: "cleanup",
  AI: "ai",
  AUDIT: "audit",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

@Injectable()
export class QueueRegistry {
  private connection: ConnectionOptions;
  private queues: Map<QueueName, Queue> = new Map();

  constructor(private readonly config: ConfigService, private readonly redis: RedisService) {
    const { host, port, password } = this.config.getOrThrow("app.redis");
    const client = this.redis.getClient();
    this.connection = {
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: null,
      keepAlive: true,
      connectTimeout: 10000,
      retryStrategy: (times: number) => Math.min(times * 200, 2000),
      ...(client as any),
    } as unknown as ConnectionOptions;
  }

  getQueue(name: QueueName): Queue {
    if (!this.queues.has(name)) {
      this.queues.set(name, new Queue(name, { connection: this.connection }));
    }
    return this.queues.get(name)!;
  }

  async add(name: QueueName, jobName: string, data: unknown, opts?: Record<string, unknown>) {
    return this.getQueue(name).add(jobName, data, opts as any);
  }

  async onModuleDestroy() {
    for (const q of this.queues.values()) {
      try { await q.close(); } catch { /* ignore */ }
    }
  }
}
