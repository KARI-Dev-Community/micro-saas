import { Column, Entity, Index, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { Workspace } from "./workspace.entity";
import { Membership } from "./membership.entity";

// Teams belong to a workspace and group members with shared access.
@Entity("teams")
export class Team extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => Workspace, (w) => w.teams, { onDelete: "CASCADE" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  organizationId!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @OneToMany(() => Membership, (m) => m.team)
  memberships!: Membership[];
}
