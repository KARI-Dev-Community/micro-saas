import { Column, Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { User } from "../../auth/entities/user.entity";
import { Organization } from "../../tenant/entities/organization.entity";
import { NotificationChannel, NotificationStatus } from "@shared/enums";

@Entity("notifications")
@Index(["userId", "createdAt"])
export class Notification extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "uuid", nullable: true })
  organizationId?: string | null;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  organization?: Organization;

  @Column({ type: "varchar", length: 32, default: NotificationChannel.IN_APP })
  channel!: NotificationChannel;

  @Column({ type: "varchar", length: 32, default: NotificationStatus.UNREAD })
  status!: NotificationStatus;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text", nullable: true })
  body?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  link?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  category?: string | null; // security | billing | system

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;
}
