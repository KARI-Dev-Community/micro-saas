import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import IORedis, { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit {
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const { host, port, password } = this.config.getOrThrow("app.redis");
    this.client = new IORedis({
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    this.client.on("error", (err) => console.error("[redis] error", err));
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) await this.client.set(key, value, "EX", ttlSeconds);
    else await this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }
}
