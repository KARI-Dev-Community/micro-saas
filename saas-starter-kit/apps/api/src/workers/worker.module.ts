import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "../core/queue/queue.registry";
import { EmailConsumer } from "./email.consumer";
import { NotificationConsumer } from "./notification.consumer";
import { ReportConsumer } from "./report.consumer";
import { CleanupConsumer } from "./cleanup.consumer";
import { AiConsumer } from "./ai.consumer";
import { EmailModule } from "../email/email.module";
import { AuthModule } from "../auth/auth.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST ?? "localhost",
          port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.REPORT },
      { name: QUEUE_NAMES.CLEANUP },
      { name: QUEUE_NAMES.AI }
    ),
    EmailModule,
    AuthModule,
    AiModule,
  ],
  providers: [EmailConsumer, NotificationConsumer, ReportConsumer, CleanupConsumer, AiConsumer],
})
export class WorkerModule {}
