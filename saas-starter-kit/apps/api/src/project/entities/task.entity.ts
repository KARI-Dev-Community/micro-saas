import { Column, Entity, Index, ManyToOne, JoinTable, ManyToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { Project } from "./project.entity";
import { User } from "../../auth/entities/user.entity";
import { FileEntity } from "../../file/entities/file.entity";
import { TaskStatus, TaskPriority } from "./project.entity";

@Entity("tasks")
@Index(["projectId", "status", "createdAt"])
export class Task extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  project!: Project;

  @Column({ type: "uuid" })
  organizationId!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "varchar", length: 32, default: TaskStatus.TODO })
  status!: TaskStatus;

  @Column({ type: "varchar", length: 32, default: TaskPriority.MEDIUM })
  priority!: TaskPriority;

  @Column({ type: "uuid", nullable: true })
  assigneeId?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  assignee?: User | null;

  @Column({ type: "timestamptz", nullable: true })
  dueDate?: Date | null;

  @Column({ type: "integer", default: 0 })
  position!: number;

  @ManyToMany(() => FileEntity, { eager: false })
  @JoinTable({
    name: "task_attachments",
    joinColumn: { name: "taskId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "fileId", referencedColumnName: "id" },
  })
  attachments!: FileEntity[];
}
