import { Controller, Get, UseGuards, Query } from "@nestjs/common";
import { JwtAuthGuard, AuthUser, CurrentOrganization } from "../core/guards/jwt-auth.guard";
import { PermissionGuard, Permissions } from "../core/guards/permission.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { SearchService } from "./search.service";

@Controller("search")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get("global")
  @Permissions("org.read")
  async global(@CurrentOrganization() orgId: string, @Query() query: Record<string, any>) {
    return this.search.search(orgId!, query);
  }
}
