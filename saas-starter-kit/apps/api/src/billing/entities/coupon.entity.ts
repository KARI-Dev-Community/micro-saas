import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

// Coupon / discount codes applied at checkout or to a subscription.
@Entity("coupons")
@Index(["code"])
export class Coupon extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  code!: string;

  @Column({ type: "varchar", length: 32, default: "percent" })
  type!: string; // percent | fixed

  @Column({ type: "integer" })
  value!: number; // percent (0-100) or cents off

  @Column({ type: "varchar", length: 8, default: "usd" })
  currency!: string;

  @Column({ type: "integer", nullable: true })
  maxRedemptions?: number | null;

  @Column({ type: "integer", default: 0 })
  redemptions!: number;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt?: Date | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;
}
