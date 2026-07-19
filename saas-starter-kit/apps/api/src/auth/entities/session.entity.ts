import {
  Column,
  Entity,
  Index,
  ManyToOne,
} from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { User } from "./user.entity";

// A persisted login session (refresh-token rotation + device tracking).
// Refresh tokens live in Redis keyed by `tokenId`; this row is the
// auditable record used for "active sessions" + revocation.
@Entity("sessions")
export class Session extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (u) => u.sessions, { onDelete: "CASCADE" })
  user!: User;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  tokenId!: string; // jti of the refresh token

  @Column({ type: "varchar", length: 255, nullable: true })
  deviceName?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  deviceType?: string | null; // desktop | mobile | tablet

  @Column({ type: "varchar", length: 255, nullable: true })
  browser?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  os?: string | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress?: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  userAgent?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  location?: string | null;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  lastActivityAt?: Date | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", default: false })
  current!: boolean; // flagged on the session behind the active access token
}
