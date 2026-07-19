import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { QueueModule } from "../core/queue/queue.module";

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), QueueModule],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
