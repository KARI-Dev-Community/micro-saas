import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

// Billing invoices / receipts. Source of truth for billing history.
@Entity("invoices")
@Index(["organizationId", "createdAt"])
export class Invoice extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  organizationId!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  number?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  providerInvoiceId?: string | null;

  @Column({ type: "integer" })
  amountCents!: number;

  @Column({ type: "varchar", length: 8, default: "usd" })
  currency!: string;

  @Column({ type: "varchar", length: 32, default: "paid" })
  status!: string; // paid | open | void | uncollectible

  @Column({ type: "varchar", length: 255, nullable: true })
  pdfUrl?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  paidAt?: Date | null;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;
}
