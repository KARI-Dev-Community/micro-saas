import { Column, Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { User } from "./user.entity";

// WebAuthn / passkey credentials registered for passwordless login.
@Entity("passkeys")
export class Passkey extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (u) => u.passkeys, { onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "varchar", length: 255 })
  credentialId!: string;

  @Column({ type: "text" })
  publicKey!: string; // base64 COSE key

  @Column({ type: "varchar", length: 255, nullable: true })
  deviceName?: string | null;

  @Column({ type: "integer" })
  counter!: number;

  @Column({ type: "varchar", length: 64, default: "cross-platform" })
  transports?: string;

  @Column({ type: "timestamptz", nullable: true })
  lastUsedAt?: Date | null;
}
