import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import { Organization } from "./entities/organization.entity";
import { Workspace } from "./entities/workspace.entity";
import { Team } from "./entities/team.entity";
import { Membership } from "./entities/membership.entity";
import { Role } from "./entities/role.entity";
import { User } from "../auth/entities/user.entity";
import { RbacService } from "./rbac.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";
import { ConfigService } from "@nestjs/config";
import { MembershipStatus, RoleName } from "@shared/enums";

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Organization) private readonly orgs: Repository<Organization>,
    @InjectRepository(Workspace) private readonly workspaces: Repository<Workspace>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(Membership) private readonly memberships: Repository<Membership>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly config: ConfigService
  ) {}

  // --- Organizations ---
  async createOrganization(input: {
    name: string;
    ownerId: string;
    slug?: string;
    locale?: string;
  }): Promise<Organization> {
    const slug = input.slug ?? this.slugify(input.name);
    if (await this.orgs.findOne({ where: { slug } })) {
      throw new ConflictException("Organization slug already taken");
    }
    const org = await this.orgs.save(
      this.orgs.create({
        name: input.name,
        slug,
        locale: input.locale ?? "en",
        currency: "USD",
        timezone: "UTC",
      })
    );
    // Owner membership with ORG_OWNER role.
    await this.memberships.save(
      this.memberships.create({
        userId: input.ownerId,
        organizationId: org.id,
        role: RoleName.ORG_OWNER,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
      })
    );
    await this.audit.record("org", "created", { actorId: input.ownerId, organizationId: org.id }, {
      entityType: "organization",
      entityId: org.id,
      newValue: { name: org.name },
    });
    return org;
  }

  async listOrganizationsForUser(userId: string): Promise<Organization[]> {
    const memberships = await this.memberships.find({
      where: { userId, status: MembershipStatus.ACTIVE },
      relations: ["organization"],
    });
    return memberships.map((m) => m.organization);
  }

  async getOrganization(id: string): Promise<Organization> {
    const org = await this.orgs.findOne({ where: { id } });
    if (!org) throw new NotFoundException("Organization not found");
    return org;
  }

  async updateOrganization(
    id: string,
    actorId: string,
    patch: Partial<Organization>
  ): Promise<Organization> {
    await this.rbac.assertPermission(actorId, id, "org.update");
    const org = await this.getOrganization(id);
    const old = { ...org };
    Object.assign(org, patch);
    const saved = await this.orgs.save(org);
    await this.audit.record("org", "updated", { actorId, organizationId: id }, {
      entityType: "organization",
      entityId: id,
      oldValue: old,
      newValue: patch,
    });
    return saved;
  }

  // --- Members / invitations ---
  async inviteMember(input: {
    organizationId: string;
    email: string;
    role: RoleName;
    invitedBy: string;
  }): Promise<Membership> {
    await this.rbac.assertPermission(input.invitedBy, input.organizationId, "org.members.invite");
    const existing = await this.memberships.findOne({
      where: { organizationId: input.organizationId, user: { email: input.email } as any },
    });
    if (existing) throw new ConflictException("User already a member");
    const token = randomUUID();
    const membership = this.memberships.create({
      organizationId: input.organizationId,
      userId: (await this.users.findOne({ where: { email: input.email } }))?.id ?? randomUUID(),
      role: input.role,
      status: MembershipStatus.INVITED,
      invitationToken: token,
      invitationExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    const saved = await this.memberships.save(membership);
    const link = `${this.config.get("app.frontendUrl")}/invite/${token}`;
    await this.email.send({ to: input.email, subject: "You're invited", template: "welcome", context: { link } });
    await this.audit.record("org", "member_invited", { actorId: input.invitedBy, organizationId: input.organizationId }, {
      entityType: "membership",
      entityId: saved.id,
    });
    return saved;
  }

  async acceptInvitation(token: string, userId: string): Promise<Membership> {
    const m = await this.memberships.findOne({ where: { invitationToken: token } });
    if (!m || (m.invitationExpiresAt && m.invitationExpiresAt < new Date())) {
      throw new BadRequestException("Invalid or expired invitation");
    }
    m.userId = userId;
    m.status = MembershipStatus.ACTIVE;
    m.invitationToken = null;
    m.joinedAt = new Date();
    return this.memberships.save(m);
  }

  async changeRole(input: {
    organizationId: string;
    membershipId: string;
    role: RoleName;
    actorId: string;
  }): Promise<void> {
    await this.rbac.assertPermission(input.actorId, input.organizationId, "org.members.role");
    await this.memberships.update(input.membershipId, { role: input.role });
    await this.audit.record("org", "member_role_changed", { actorId: input.actorId, organizationId: input.organizationId }, {
      entityType: "membership",
      entityId: input.membershipId,
      newValue: { role: input.role },
    });
  }

  async removeMember(input: {
    organizationId: string;
    membershipId: string;
    actorId: string;
  }): Promise<void> {
    await this.rbac.assertPermission(input.actorId, input.organizationId, "org.members.remove");
    await this.memberships.delete(input.membershipId);
    await this.audit.record("org", "member_removed", { actorId: input.actorId, organizationId: input.organizationId }, {
      entityType: "membership",
      entityId: input.membershipId,
    });
  }

  async listMembers(organizationId: string, actorId: string): Promise<Membership[]> {
    await this.rbac.assertPermission(actorId, organizationId, "org.read");
    return this.memberships.find({
      where: { organizationId },
      relations: ["user", "organization"],
      order: { createdAt: "ASC" },
    });
  }

  // --- Organization switching (returns a scoped token) ---
  async switchOrganization(userId: string, organizationId: string): Promise<void> {
    const m = await this.memberships.findOne({ where: { userId, organizationId, status: MembershipStatus.ACTIVE } });
    if (!m) throw new ForbiddenException("Not a member of this organization");
    // The client stores the chosen org id and sends it via x-organization-id header.
  }

  // --- Workspaces ---
  async createWorkspace(input: { organizationId: string; name: string; actorId: string }): Promise<Workspace> {
    await this.rbac.assertPermission(input.actorId, input.organizationId, "org.update");
    const ws = this.workspaces.create({
      organizationId: input.organizationId,
      name: input.name,
      slug: this.slugify(input.name),
    });
    return this.workspaces.save(ws);
  }

  async listWorkspaces(organizationId: string): Promise<Workspace[]> {
    return this.workspaces.find({ where: { organizationId, isActive: true } });
  }

  // --- Teams ---
  async createTeam(input: {
    workspaceId: string;
    organizationId: string;
    name: string;
    actorId: string;
  }): Promise<Team> {
    await this.rbac.assertPermission(input.actorId, input.organizationId, "org.update");
    const team = this.teams.create({
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      name: input.name,
    });
    return await this.teams.save(team);
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 64);
  }
}
