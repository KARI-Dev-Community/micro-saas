import { Column, Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { Project } from "./project.entity";
import { Task } from "./task.entity";
import { User } from "../../auth/entities/user.entity";

// Activity timeline for projects/tasks (created/updated/comment/etc).
@Entity("activities")
@Index(["organizationId", "createdAt"])
export class Activity extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  organizationId!: string;

  @Column({ type: "uuid", nullable: true })
  projectId?: string | null;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  project?: Project | null;

  @Column({ type: "uuid", nullable: true })
  taskId?: string | null;

  @ManyToOne(() => Task, { onDelete: "CASCADE" })
  task?: Task | null;

  @Column({ type: "uuid" })
  actorId!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  actor!: User;

  @Column({ type: "varchar", length: 64 })
  type!: string; // created | updated | commented | status_changed

  @Column({ type: "text", nullable: true })
  message?: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;
}
