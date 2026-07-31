import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "../core/queue/queue.registry";
import { EmailConsumer } from "./email.consumer";
import { NotificationConsumer } from "./notification.consumer";
import { ReportConsumer } from "./report.consumer";
import { CleanupConsumer } from "./cleanup.consumer";
import { AiConsumer } from "./ai.consumer";
import { AuditConsumer } from "./audit.consumer";
import { Session } from "../auth/entities/session.entity";
import { AiMessage } from "../ai/entities/ai-message.entity";
import { AiUsage } from "../ai/entities/ai-usage.entity";
import { AuditLog } from "../audit/entities/audit-log.entity";
import { EmailModule } from "../email/email.module";
import { AuthModule } from "../auth/auth.module";
import { AiModule } from "../ai/ai.module";
import { AuditModule } from "../audit/audit.module";

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
      { name: QUEUE_NAMES.AI },
      { name: QUEUE_NAMES.AUDIT }
    ),
    TypeOrmModule.forFeature([Session, AiMessage, AiUsage, AuditLog]),
    EmailModule,
    AuthModule,
    AiModule,
    AuditModule,
  ],
  providers: [EmailConsumer, NotificationConsumer, ReportConsumer, CleanupConsumer, AiConsumer, AuditConsumer],
})
export class WorkerModule {}
