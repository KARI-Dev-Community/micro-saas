import {
  Column,
  Entity,
  Index,
  ManyToOne,
} from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { Organization } from "../../tenant/entities/organization.entity";
import { Workspace } from "../../tenant/entities/workspace.entity";
import { User } from "../../auth/entities/user.entity";

export enum TaskStatus {
  BACKLOG = "backlog",
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  REVIEW = "review",
  DONE = "done",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

@Entity("projects")
@Index(["organizationId", "workspaceId", "createdAt"])
export class Project extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  organization!: Organization;

  @Column({ type: "uuid", nullable: true })
  workspaceId?: string | null;

  @ManyToOne(() => Workspace, { onDelete: "SET NULL" })
  workspace?: Workspace | null;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "varchar", length: 32, default: "active" })
  status!: string; // active | archived | completed

  @Column({ type: "uuid", nullable: true })
  ownerId?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  owner?: User | null;
}
