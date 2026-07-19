import { Column, Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { AiConversation } from "./ai-conversation.entity";

@Entity("ai_messages")
@Index(["conversationId", "createdAt"])
export class AiMessage extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  conversationId!: string;

  @ManyToOne(() => AiConversation, (c) => c.id, { onDelete: "CASCADE" })
  conversation!: AiConversation;

  @Column({ type: "varchar", length: 16 }) // user | assistant | system
  role!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "integer", nullable: true })
  promptTokens?: number | null;

  @Column({ type: "integer", nullable: true })
  completionTokens?: number | null;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;
}
