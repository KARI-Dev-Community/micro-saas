import { Column, Entity, Index, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { Organization } from "./organization.entity";
import { Team } from "./team.entity";

// Workspaces belong to an organization and group projects/data.
// Tenant isolation is enforced at the query layer by scoping to
// organizationId + workspaceId on every request.
@Entity("workspaces")
export class Workspace extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  organizationId!: string;

  @ManyToOne(() => Organization, (o) => o.workspaces, { onDelete: "CASCADE" })
  organization!: Organization;

  @Column({ type: "varchar", length: 64 })
  name!: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  slug?: string | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @OneToMany(() => Team, (t) => t.workspace)
  teams!: Team[];
}
