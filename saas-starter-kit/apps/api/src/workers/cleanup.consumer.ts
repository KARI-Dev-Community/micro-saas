import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Session } from "../auth/entities/session.entity";

// Cleanup: expire sessions, purge old audit logs / soft-deleted rows.
@Processor("cleanup")
export class CleanupConsumer extends WorkerHost {
  private readonly logger = new Logger(CleanupConsumer.name);

  constructor(@InjectRepository(Session) private readonly sessions: Repository<Session>) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.data.task === "expire_sessions") {
      const res = await this.sessions
        .createQueryBuilder()
        .update(Session)
        .set({ isActive: false })
        .where("expiresAt < :now", { now: new Date() })
        .execute();
      this.logger.debug(`Expired ${res.affected} sessions`);
    }
  }
}
