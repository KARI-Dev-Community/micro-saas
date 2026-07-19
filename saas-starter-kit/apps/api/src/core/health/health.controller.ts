import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator } from "@nestjs/terminus";
import { RedisService } from "../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly redis: RedisService
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      () => this.db.pingCheck("database"),
      () => this.memory.checkHeap("memory_heap", 512 * 1024 * 1024),
      async () => {
        try {
          await this.redis.getClient().ping();
          return { redis: { status: "up" } };
        } catch {
          return { redis: { status: "down" } };
        }
      },
    ]);
  }

  @Get("live")
  async liveness() {
    return { status: "ok" };
  }
}
