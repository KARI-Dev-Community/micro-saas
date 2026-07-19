import { Column, Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { User } from "../../auth/entities/user.entity";
import { Organization } from "../../tenant/entities/organization.entity";

// AI chat conversations. Messages stored separately for history.
@Entity("ai_conversations")
@Index(["userId", "createdAt"])
export class AiConversation extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "uuid", nullable: true })
  organizationId?: string | null;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  organization?: Organization;

  @Column({ type: "varchar", length: 160, default: "New conversation" })
  title!: string;

  @Column({ type: "varchar", length: 64, default: "chat" })
  type!: string; // chat | assistant

  @Column({ type: "boolean", default: true })
  isActive!: boolean;
}
