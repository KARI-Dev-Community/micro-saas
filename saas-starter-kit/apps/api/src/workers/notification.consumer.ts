import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";

// Notification fan-out (realtime websocket push happens here in production).
@Processor("notification")
export class NotificationConsumer extends WorkerHost {
  private readonly logger = new Logger(NotificationConsumer.name);

  async process(job: Job): Promise<void> {
    this.logger.debug(`Notification ${job.data.notificationId} -> user ${job.data.userId}`);
    // TODO: push via WS/SSE gateway.
  }
}
