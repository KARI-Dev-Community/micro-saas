import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "../audit/entities/audit-log.entity";

@Processor("audit")
export class AuditConsumer extends WorkerHost {
  private readonly logger = new Logger(AuditConsumer.name);

  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== "save") return;
    try {
      await this.repo.save(this.repo.create(job.data));
    } catch (err) {
      this.logger.error(`Failed to persist audit log: ${(err as Error).message}`);
    }
  }
}
