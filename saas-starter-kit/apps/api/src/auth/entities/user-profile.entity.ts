import { Column, Entity, Index, OneToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { User } from "./user.entity";

@Entity("user_profiles")
export class UserProfile extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @OneToOne(() => User, (u) => u.profiles)
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "varchar", length: 120, nullable: true })
  firstName?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  lastName?: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  avatarUrl?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  phone?: string | null;

  @Column({ type: "jsonb", nullable: true, default: () => "'{}'" })
  preferences!: Record<string, unknown>;

  @Column({ type: "jsonb", nullable: true, default: () => "'{}'" })
  notificationSettings!: {
    email: boolean;
    inApp: boolean;
    productUpdates: boolean;
    securityAlerts: boolean;
  };
}
