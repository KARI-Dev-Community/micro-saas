import { Column, Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { Organization } from "../../tenant/entities/organization.entity";
import { PlanType, SubscriptionStatus } from "@shared/enums";

@Entity("subscriptions")
export class Subscription extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  organizationId!: string;

  @ManyToOne(() => Organization, (o) => o.subscriptions, { onDelete: "CASCADE" })
  organization!: Organization;

  @Column({ type: "varchar", length: 32, default: PlanType.FREE })
  plan!: PlanType;

  @Column({ type: "varchar", length: 32, default: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @Column({ type: "varchar", length: 64, nullable: true })
  provider?: string | null; // stripe | paddle | manual

  @Column({ type: "varchar", length: 255, nullable: true })
  providerSubscriptionId?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  providerCustomerId?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  couponCode?: string | null;

  @Column({ type: "integer", nullable: true })
  amountCents?: number | null;

  @Column({ type: "varchar", length: 8, default: "usd" })
  currency!: string;

  @Column({ type: "timestamptz", nullable: true })
  trialEndsAt?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  currentPeriodStart?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  currentPeriodEnd?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  canceledAt?: Date | null;

  @Column({ type: "boolean", default: false })
  cancelAtPeriodEnd!: boolean;
}
