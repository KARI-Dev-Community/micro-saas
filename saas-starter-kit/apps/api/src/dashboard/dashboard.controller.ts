import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, AuthUser, CurrentOrganization } from "../core/guards/jwt-auth.guard";
import { PermissionGuard, Permissions } from "../core/guards/permission.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { DashboardService } from "./dashboard.service";
import { Permission } from "@shared/enums";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dash: DashboardService) {}

  @Get("org")
  @Permissions(Permission.DASHBOARD_READ)
  async org(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload) {
    return this.dash.orgDashboard(orgId!, user.sub);
  }

  @Get("revenue")
  @Permissions(Permission.ANALYTICS_REVENUE_READ)
  async revenue(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload) {
    return this.dash.revenue(orgId!, user.sub);
  }

  @Get("users")
  @Permissions(Permission.ANALYTICS_USER_READ)
  async users(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload) {
    return this.dash.userAnalytics(orgId!, user.sub);
  }

  @Get("ai-spend")
  @Permissions(Permission.AI_USAGE_READ)
  async ai(@CurrentOrganization() orgId: string) {
    return this.dash.aiSpend(orgId!);
  }
}
