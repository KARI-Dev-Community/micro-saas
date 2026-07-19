import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification } from "./entities/notification.entity";
import { NotificationChannel, NotificationStatus } from "@shared/enums";
import { QueueRegistry, QUEUE_NAMES } from "../core/queue/queue.registry";

export interface NotifyInput {
  userId: string;
  organizationId?: string;
  title: string;
  body?: string;
  link?: string;
  category?: string;
  channels?: NotificationChannel[];
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly queues: QueueRegistry
  ) {}

  // Creates an in-app notification and (optionally) fans out to email/realtime.
  async notify(input: NotifyInput): Promise<Notification> {
    const channels = input.channels ?? [NotificationChannel.IN_APP];
    const n = this.repo.create({
      userId: input.userId,
      organizationId: input.organizationId ?? null,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      category: input.category ?? null,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.UNREAD,
    });
    const saved = await this.repo.save(n);

    if (channels.includes(NotificationChannel.REALTIME)) {
      await this.queues.add(QUEUE_NAMES.NOTIFICATION, "realtime", {
        notificationId: saved.id,
        userId: input.userId,
      });
    }
    return saved;
  }

  async list(userId: string, unreadOnly = false): Promise<Notification[]> {
    return this.repo.find({
      where: unreadOnly
        ? { userId, status: NotificationStatus.UNREAD }
        : { userId },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.repo.update(
      { id, userId },
      { status: NotificationStatus.READ }
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update(
      { userId, status: NotificationStatus.UNREAD },
      { status: NotificationStatus.READ }
    );
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({
      where: { userId, status: NotificationStatus.UNREAD },
    });
  }
}
