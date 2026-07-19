import {
  Column,
  Entity,
  Index,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { AuthProvider, UserStatus, TwoFactorMethod } from "@shared/enums";
import { Membership } from "../../tenant/entities/membership.entity";
import { Session } from "../../auth/entities/session.entity";
import { Passkey } from "../../auth/entities/passkey.entity";
import { UserProfile } from "./user-profile.entity";

@Entity("users")
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 255, nullable: true, select: false })
  passwordHash?: string | null;

  @Column({ type: "varchar", length: 64, default: UserStatus.PENDING })
  status!: UserStatus;

  @Column({ type: "varchar", length: 32, default: AuthProvider.EMAIL })
  provider!: AuthProvider;

  @Column({ type: "varchar", length: 255, nullable: true })
  providerId?: string | null;

  @Column({ type: "boolean", default: false })
  emailVerified!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  emailVerificationToken?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  emailVerificationExpiresAt?: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  passwordResetToken?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  passwordResetExpiresAt?: Date | null;

  @Column({ type: "varchar", length: 32, default: TwoFactorMethod.NONE })
  twoFactorMethod!: TwoFactorMethod;

  @Column({ type: "varchar", length: 64, nullable: true, select: false })
  twoFactorSecret?: string | null;

  @Column({ type: "boolean", default: false })
  twoFactorEnabled!: boolean;

  // Locale / preferences (defaults).
  @Column({ type: "varchar", length: 16, default: "en" })
  locale!: string;

  @Column({ type: "varchar", length: 64, default: "UTC" })
  timezone!: string;

  @Column({ type: "varchar", length: 8, default: "USD" })
  currency!: string;

  @OneToMany(() => Membership, (m) => m.user)
  memberships!: Membership[];

  @OneToMany(() => Session, (s) => s.user)
  sessions!: Session[];

  @OneToMany(() => Passkey, (p) => p.user)
  passkeys!: Passkey[];

  @OneToMany(() => UserProfile, (p) => p.user)
  profiles!: UserProfile[];
}
