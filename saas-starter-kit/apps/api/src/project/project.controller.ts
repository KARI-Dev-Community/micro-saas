import { Controller, Get, Post, Body, Query, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, AuthUser, CurrentOrganization } from "../core/guards/jwt-auth.guard";
import { PermissionGuard, Permissions } from "../core/guards/permission.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { ProjectService } from "./project.service";
import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Permission } from "@shared/enums";

class CreateProjectDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() workspaceId?: string;
}
class CreateTaskDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() priority?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() assigneeId?: string;
}
class CommentDto {
  @ApiProperty() @IsString() content!: string;
}

@Controller("projects")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProjectController {
  constructor(private readonly svc: ProjectService) {}

  @Get()
  @Permissions(Permission.PROJECT_READ)
  async list(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Query() q: Record<string, any>) {
    return this.svc.listProjects(orgId!, user.sub, q);
  }

  @Post()
  @Permissions(Permission.PROJECT_CREATE)
  async create(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() dto: CreateProjectDto) {
    return this.svc.createProject({ organizationId: orgId!, userId: user.sub, name: dto.name, description: dto.description, workspaceId: dto.workspaceId });
  }

  @Get(":id/tasks")
  @Permissions(Permission.PROJECT_TASK_READ)
  async tasks(@Param("id") id: string, @CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Query() q: Record<string, any>) {
    return this.svc.listTasks(id, orgId!, user.sub, q);
  }

  @Post(":id/tasks")
  @Permissions(Permission.PROJECT_TASK_CREATE)
  async createTask(@Param("id") id: string, @CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() dto: CreateTaskDto) {
    return this.svc.createTask({ organizationId: orgId!, userId: user.sub, projectId: id, title: dto.title, description: dto.description, status: dto.status, priority: dto.priority, assigneeId: dto.assigneeId });
  }

  @Post("tasks/:taskId/comments")
  @Permissions(Permission.PROJECT_TASK_READ)
  async comment(@Param("taskId") taskId: string, @CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() dto: CommentDto) {
    return this.svc.comment({ organizationId: orgId!, userId: user.sub, taskId, content: dto.content });
  }
}

@Controller("activity")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ActivityController {
  constructor(private readonly svc: ProjectService) {}

  @Get()
  @Permissions(Permission.PROJECT_READ)
  async timeline(@CurrentOrganization() orgId: string, @Query() q: Record<string, any>) {
    return this.svc.activityTimeline(orgId!, q);
  }
}
