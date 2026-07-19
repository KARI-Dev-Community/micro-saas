import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

// Saved prompts / prompt templates for the AI assistant.
@Entity("ai_prompts")
@Index(["organizationId", "createdAt"])
export class AiPrompt extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  organizationId?: string | null;

  @Column({ type: "uuid", nullable: true })
  createdBy?: string | null;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 64, default: "general" })
  category!: string;

  @Column({ type: "boolean", default: false })
  isSystem!: boolean;
}
