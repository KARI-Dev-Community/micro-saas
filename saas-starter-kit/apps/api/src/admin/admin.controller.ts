import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, AuthUser } from "../core/guards/jwt-auth.guard";
import { PermissionGuard, Permissions } from "../core/guards/permission.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { AdminService } from "./admin.service";
import { Permission } from "@shared/enums";

@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("stats")
  @Permissions(Permission.PLATFORM_READ)
  async stats() {
    return this.admin.platformStats();
  }

  @Get("users")
  @Permissions(Permission.PLATFORM_USERS_MANAGE)
  async users() {
    return this.admin.listUsers();
  }

  @Get("organizations")
  @Permissions(Permission.PLATFORM_ORGS_MANAGE)
  async orgs() {
    return this.admin.listOrgs();
  }

  @Get("feature-flags")
  @Permissions(Permission.PLATFORM_FEATURE_FLAGS)
  async flags() {
    return this.admin.listFeatureFlags();
  }

  @Post("feature-flags")
  @Permissions(Permission.PLATFORM_FEATURE_FLAGS)
  async setFlag(@Body() body: { key: string; enabled: boolean }) {
    return this.admin.setFeatureFlag(body.key, body.enabled);
  }
}
