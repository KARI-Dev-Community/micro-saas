import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

export const QUEUE_NAMES = {
  EMAIL: "email",
  NOTIFICATION: "notification",
  REPORT: "report",
  CLEANUP: "cleanup",
  AI: "ai",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

@Injectable()
export class QueueRegistry {
  private connection: ConnectionOptions;
  private queues: Map<QueueName, Queue> = new Map();

  constructor(private readonly config: ConfigService) {
    const { host, port, password } = this.config.getOrThrow("app.redis");
    this.connection = new IORedis({
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: null,
    }) as unknown as ConnectionOptions;
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
}
