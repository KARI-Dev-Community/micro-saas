import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentOrganization } from "../core/guards/jwt-auth.guard";
import { PermissionGuard, Permissions } from "../core/guards/permission.guard";
import { DashboardService } from "./dashboard.service";
import { Permission } from "@shared/enums";

@Controller("dashboard")
@UseGuards(PermissionGuard)
export class DashboardController {
  constructor(private readonly dash: DashboardService) {}

  @Get("org")
  @Permissions(Permission.DASHBOARD_READ)
  async org(@CurrentOrganization() orgId: string) {
    return this.dash.orgDashboard(orgId!);
  }

  @Get("revenue")
  @Permissions(Permission.ANALYTICS_REVENUE_READ)
  async revenue(@CurrentOrganization() orgId: string) {
    return this.dash.revenue(orgId!);
  }

  @Get("users")
  @Permissions(Permission.ANALYTICS_USER_READ)
  async users(@CurrentOrganization() orgId: string) {
    return this.dash.userAnalytics(orgId!);
  }

  @Get("ai-spend")
  @Permissions(Permission.AI_USAGE_READ)
  async ai(@CurrentOrganization() orgId: string) {
    return this.dash.aiSpend(orgId!);
  }
}
