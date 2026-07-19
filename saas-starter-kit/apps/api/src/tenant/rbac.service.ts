import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Membership } from "./entities/membership.entity";
import { Role } from "./entities/role.entity";
import { RoleName, MembershipStatus, Permission } from "@shared/enums";

// Resolves effective permissions for (user, organization) from the
// membership's role. Super Admin bypasses all checks.
@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>
  ) {}

  async getUserPermissions(
    userId: string,
    organizationId: string
  ): Promise<{ role: RoleName; permissions: string[] }> {
    const membership = await this.membershipRepo.findOne({
      where: { userId, organizationId, status: MembershipStatus.ACTIVE },
      relations: ["organization"],
    });
    if (!membership) {
      throw new NotFoundException("Membership not found for this organization");
    }
    return this.resolveForRole(membership.role);
  }

  async resolveForRole(role: RoleName): Promise<{ role: RoleName; permissions: string[] }> {
    if (role === RoleName.SUPER_ADMIN) {
      const all = await this.roleRepo.find({ where: { name: RoleName.SUPER_ADMIN }, relations: ["permissions"] });
      const perms = all[0]?.permissions.map((p) => p.key) ?? [];
      return { role, permissions: perms.length ? perms : Object.values(Permission) };
    }
    const roleEntity = await this.roleRepo.findOne({
      where: { name: role },
      relations: ["permissions"],
    });
    return { role, permissions: roleEntity?.permissions.map((p) => p.key) ?? [] };
  }

  async assertPermission(
    userId: string,
    organizationId: string,
    required: string
  ): Promise<void> {
    const { role, permissions } = await this.getUserPermissions(userId, organizationId);
    if (role === RoleName.SUPER_ADMIN) return;
    if (!permissions.includes(required)) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }
  }

  async assertAny(
    userId: string,
    organizationId: string,
    required: string[]
  ): Promise<void> {
    const { role, permissions } = await this.getUserPermissions(userId, organizationId);
    if (role === RoleName.SUPER_ADMIN) return;
    if (!required.some((p) => permissions.includes(p))) {
      throw new ForbiddenException(`Requires one of: ${required.join(", ")}`);
    }
  }
}
