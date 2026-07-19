import { Column, Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { Task } from "./task.entity";
import { User } from "../../auth/entities/user.entity";

@Entity("task_comments")
@Index(["taskId", "createdAt"])
export class TaskComment extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  taskId!: string;

  @ManyToOne(() => Task, { onDelete: "CASCADE" })
  task!: Task;

  @Column({ type: "uuid" })
  authorId!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  author!: User;

  @Column({ type: "text" })
  content!: string;
}
