import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Organization } from "./entities/organization.entity";
import { Workspace } from "./entities/workspace.entity";
import { Team } from "./entities/team.entity";
import { Membership } from "./entities/membership.entity";
import { Role } from "./entities/role.entity";
import { Permission } from "./entities/permission.entity";
import { TenantService } from "./tenant.service";
import { RbacService } from "./rbac.service";
import { RbacSeeder } from "./rbac.seeder";
import { TenantController } from "./tenant.controller";
import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Workspace, Team, Membership, Role, Permission]),
    AuditModule,
    EmailModule,
    AuthModule,
  ],
  providers: [TenantService, RbacService, RbacSeeder],
  controllers: [TenantController],
  exports: [TenantService, RbacService, RbacSeeder],
})
export class TenantModule {}
