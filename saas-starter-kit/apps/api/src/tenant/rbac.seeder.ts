import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Permission } from "./entities/permission.entity";
import { Role } from "./entities/role.entity";
import { ROLE_PERMISSIONS, Permission as PermEnum, RoleName } from "@shared/enums";

// Seeds the 6 system roles + all granular permissions on boot.
@Injectable()
export class RbacSeeder {
  private readonly logger = new Logger(RbacSeeder.name);

  constructor(
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>
  ) {}

  async seed(): Promise<void> {
    const allKeys = Object.values(PermEnum);
    const existing = await this.permRepo.find();
    const existingKeys = new Set(existing.map((p) => p.key));

    const toCreate = allKeys
      .filter((k) => !existingKeys.has(k))
      .map((k) =>
        this.permRepo.create({
          key: k,
          label: humanize(k),
          group: groupOf(k),
          description: k,
        })
      );
    if (toCreate.length) await this.permRepo.save(toCreate);

    const perms = await this.permRepo.find();
    const byKey = new Map(perms.map((p) => [p.key, p]));

    for (const roleName of Object.values(RoleName)) {
      const found = await this.roleRepo.findOne({ where: { name: roleName }, relations: ["permissions"] });
      if (found) continue;
      const keys = ROLE_PERMISSIONS[roleName] ?? [];
      const role = this.roleRepo.create({
        name: roleName,
        label: humanize(roleName),
        isSystem: true,
        description: `${roleName} system role`,
        permissions: keys.map((k) => byKey.get(k)).filter(Boolean) as Permission[],
      });
      await this.roleRepo.save(role);
    }
    this.logger.log("RBAC roles + permissions seeded");
  }
}

function humanize(s: string): string {
  return s
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupOf(key: string): string {
  const [resource] = key.split(".");
  const map: Record<string, string> = {
    platform: "Platform",
    org: "Organization",
    user: "User",
    project: "Project Management",
    ai: "AI",
    file: "Files",
    audit: "Audit",
    notification: "Notifications",
    dashboard: "Dashboards",
    analytics: "Analytics",
  };
  return map[resource] ?? "General";
}
