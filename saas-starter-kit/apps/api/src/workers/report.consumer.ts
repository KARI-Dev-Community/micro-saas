import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";

// Scheduled reports (daily/weekly summaries). Triggered via cron in production.
@Processor("report")
export class ReportConsumer extends WorkerHost {
  private readonly logger = new Logger(ReportConsumer.name);

  async process(job: Job): Promise<void> {
    this.logger.debug(`Generating report ${job.data.reportType} for org ${job.data.organizationId}`);
  }
}
