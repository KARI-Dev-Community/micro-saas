import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

// Per-org AI usage + cost tracking. Inked daily per model.
@Entity("ai_usage")
@Index(["organizationId", "date"])
export class AiUsage extends BaseEntity {
  @Index()
  @Column({ type: "uuid", nullable: true })
  organizationId?: string | null;

  @Column({ type: "uuid", nullable: true })
  userId?: string | null;

  @Column({ type: "date" })
  date!: string;

  @Column({ type: "varchar", length: 64 })
  model!: string;

  @Column({ type: "integer", default: 0 })
  promptTokens!: number;

  @Column({ type: "integer", default: 0 })
  completionTokens!: number;

  @Column({ type: "decimal", precision: 12, scale: 6, default: 0 })
  costUsd!: number;

  @Column({ type: "integer", default: 0 })
  requestCount!: number;
}
