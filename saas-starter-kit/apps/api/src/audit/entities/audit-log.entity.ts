import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

// Append-only audit log. Never updated/deleted in normal operation.
@Entity("audit_logs")
@Index(["actorId", "createdAt"])
@Index(["module", "createdAt"])
export class AuditLog extends BaseEntity {
  @Index()
  @Column({ type: "uuid", nullable: true })
  actorId?: string | null; // user who performed the action

  @Index()
  @Column({ type: "uuid", nullable: true })
  organizationId?: string | null;

  @Column({ type: "varchar", length: 64 })
  module!: string; // auth | user | billing | project | security ...

  @Column({ type: "varchar", length: 64 })
  action!: string; // login | create | update | delete ...

  @Column({ type: "varchar", length: 64, nullable: true })
  entityType?: string | null;

  @Column({ type: "uuid", nullable: true })
  entityId?: string | null;

  @Column({ type: "jsonb", nullable: true })
  oldValue?: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  newValue?: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress?: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  userAgent?: string | null;
}
