import { Column, Entity, Index, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { Membership } from "./membership.entity";
import { Workspace } from "./workspace.entity";
import { Subscription } from "../../billing/entities/subscription.entity";

@Entity("organizations")
export class Organization extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  slug!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "varchar", length: 512, nullable: true })
  logoUrl?: string | null;

  @Column({ type: "varchar", length: 64, default: "en" })
  locale!: string;

  @Column({ type: "varchar", length: 64, default: "UTC" })
  timezone!: string;

  @Column({ type: "varchar", length: 8, default: "USD" })
  currency!: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "jsonb", nullable: true, default: () => "'{}'" })
  settings!: Record<string, unknown>;

  @OneToMany(() => Membership, (m) => m.organization)
  memberships!: Membership[];

  @OneToMany(() => Workspace, (w) => w.organization)
  workspaces!: Workspace[];

  @OneToMany(() => Subscription, (s) => s.organization)
  subscriptions!: Subscription[];
}
