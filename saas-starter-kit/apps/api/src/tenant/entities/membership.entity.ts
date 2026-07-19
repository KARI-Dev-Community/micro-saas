import { Column, Entity, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { User } from "../../auth/entities/user.entity";
import { Organization } from "./organization.entity";
import { Workspace } from "./workspace.entity";
import { Team } from "./team.entity";
import { RoleName, MembershipStatus } from "@shared/enums";

// Links a user to an organization (and optionally a team/workspace).
// Holds the active role used for RBAC inside that tenant.
@Entity("memberships")
export class Membership extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (u) => u.memberships, { onDelete: "CASCADE" })
  user!: User;

  @Index()
  @Column({ type: "uuid" })
  organizationId!: string;

  @ManyToOne(() => Organization, (o) => o.memberships, { onDelete: "CASCADE" })
  organization!: Organization;

  @Column({ type: "uuid", nullable: true })
  workspaceId?: string | null;

  @ManyToOne(() => Workspace, (w) => w.teams, { onDelete: "SET NULL" })
  @JoinColumn({ name: "workspaceId" })
  workspace?: Workspace | null;

  @Column({ type: "uuid", nullable: true })
  teamId?: string | null;

  @ManyToOne(() => Team, (t) => t.memberships, { onDelete: "SET NULL" })
  @JoinColumn({ name: "teamId" })
  team?: Team | null;

  @Column({ type: "varchar", length: 32, default: RoleName.MEMBER })
  role!: RoleName;

  @Column({ type: "varchar", length: 32, default: MembershipStatus.INVITED })
  status!: MembershipStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  invitationToken?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  invitationExpiresAt?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  joinedAt?: Date | null;
}
