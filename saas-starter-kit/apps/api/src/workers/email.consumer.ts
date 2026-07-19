import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { EmailService } from "../email/email.service";

@Processor("email")
export class EmailConsumer extends WorkerHost {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor(private readonly email: EmailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing email job ${job.id}`);
    await this.email.deliver(job.data);
  }
}
