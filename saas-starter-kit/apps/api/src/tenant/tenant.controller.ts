import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard, AuthUser, CurrentOrganization } from "../core/guards/jwt-auth.guard";
import { PermissionGuard, Permissions, PermissionMode } from "../core/guards/permission.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { TenantService } from "./tenant.service";
import { RoleName } from "@shared/enums";
import { IsString, IsEmail, IsOptional, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

class CreateOrgDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() slug?: string;
}
class InviteDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty({ enum: RoleName }) @IsEnum(RoleName) role!: RoleName;
}
class ChangeRoleDto {
  @ApiProperty() @IsEnum(RoleName) role!: RoleName;
}
class CreateWorkspaceDto {
  @ApiProperty() @IsString() name!: string;
}
class CreateTeamDto {
  @ApiProperty() @IsString() workspaceId!: string;
  @ApiProperty() @IsString() name!: string;
}

@Controller("organizations")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TenantController {
  constructor(private readonly tenant: TenantService) {}

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  async myOrgs(@AuthUser() user: AccessTokenPayload) {
    return this.tenant.listOrganizationsForUser(user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@AuthUser() user: AccessTokenPayload, @Body() dto: CreateOrgDto, @Req() req: Request) {
    return this.tenant.createOrganization({ name: dto.name, slug: dto.slug, ownerId: user.sub });
  }

  @Get(":id")
  @Permissions("org.read")
  async get(@Param("id") id: string) {
    return this.tenant.getOrganization(id);
  }

  @Patch(":id")
  @Permissions("org.update")
  async update(@Param("id") id: string, @AuthUser() user: AccessTokenPayload, @Body() body: any) {
    return this.tenant.updateOrganization(id, user.sub, body);
  }

  @Get(":id/members")
  @Permissions("org.read")
  async members(@Param("id") id: string, @AuthUser() user: AccessTokenPayload) {
    return this.tenant.listMembers(id, user.sub);
  }

  @Post(":id/members/invite")
  @Permissions("org.members.invite")
  async invite(@Param("id") id: string, @AuthUser() user: AccessTokenPayload, @Body() dto: InviteDto) {
    return this.tenant.inviteMember({ organizationId: id, email: dto.email, role: dto.role, invitedBy: user.sub });
  }

  @Post(":id/members/:mid/role")
  @Permissions("org.members.role")
  async changeRole(@Param("id") id: string, @Param("mid") mid: string, @AuthUser() user: AccessTokenPayload, @Body() dto: ChangeRoleDto) {
    await this.tenant.changeRole({ organizationId: id, membershipId: mid, role: dto.role, actorId: user.sub });
    return { updated: true };
  }

  @Delete(":id/members/:mid")
  @Permissions("org.members.remove")
  async remove(@Param("id") id: string, @Param("mid") mid: string, @AuthUser() user: AccessTokenPayload) {
    await this.tenant.removeMember({ organizationId: id, membershipId: mid, actorId: user.sub });
    return { removed: true };
  }

  @Get(":id/workspaces")
  @Permissions("org.read")
  async workspaces(@Param("id") id: string) {
    return this.tenant.listWorkspaces(id);
  }

  @Post(":id/workspaces")
  @Permissions("org.update")
  async createWorkspace(@Param("id") id: string, @AuthUser() user: AccessTokenPayload, @Body() dto: CreateWorkspaceDto) {
    return this.tenant.createWorkspace({ organizationId: id, name: dto.name, actorId: user.sub });
  }

  @Post(":id/teams")
  @Permissions("org.update")
  async createTeam(@Param("id") id: string, @AuthUser() user: AccessTokenPayload, @Body() dto: CreateTeamDto) {
    return this.tenant.createTeam({ workspaceId: dto.workspaceId, organizationId: id, name: dto.name, actorId: user.sub });
  }
}
