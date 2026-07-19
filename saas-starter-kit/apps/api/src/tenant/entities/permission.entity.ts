import { Column, Entity, Index, ManyToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { Role } from "./role.entity";
import { Permission as PermissionEnum } from "@shared/enums";

// A single granular permission (e.g. "project.create"). Grouped by a
// `group` field for UI grouping (Permission Groups).
@Entity("permissions")
export class Permission extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: "varchar", length: 64, unique: true })
  key!: PermissionEnum;

  @Column({ type: "varchar", length: 160 })
  label!: string;

  @Column({ type: "varchar", length: 64, default: "General" })
  group!: string; // Permission group for UI

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @ManyToMany(() => Role, (r) => r.permissions)
  roles!: Role[];
}
