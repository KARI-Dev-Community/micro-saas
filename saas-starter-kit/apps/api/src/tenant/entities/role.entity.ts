import { Column, Entity, Index, ManyToMany, JoinTable } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { Permission } from "./permission.entity";
import { RoleName } from "@shared/enums";

// Roles map to a set of permissions. The platform ships 6 default roles
// (seeded on boot). Custom org roles can be added per organization.
@Entity("roles")
export class Role extends BaseEntity {
  @Index()
  @Column({ type: "varchar", length: 32, unique: true })
  name!: RoleName;

  @Column({ type: "varchar", length: 160 })
  label!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "boolean", default: false })
  isSystem!: boolean; // true for the 6 seeded defaults

  @Column({ type: "uuid", nullable: true })
  organizationId?: string | null; // null => platform-wide

  @ManyToMany(() => Permission, (p) => p.roles, { eager: true })
  @JoinTable({
    name: "role_permissions",
    joinColumn: { name: "roleId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permissionId", referencedColumnName: "id" },
  })
  permissions!: Permission[];
}
