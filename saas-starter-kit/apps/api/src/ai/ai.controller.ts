import { Controller, Get, Post, Body, UseGuards, Query } from "@nestjs/common";
import { JwtAuthGuard, AuthUser, CurrentOrganization } from "../core/guards/jwt-auth.guard";
import { PermissionGuard, Permissions } from "../core/guards/permission.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { AiService } from "./ai.service";
import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

class ChatDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() conversationId?: string;
  @ApiProperty() @IsString() prompt!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() systemPrompt?: string;
}

@Controller("ai")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("chat")
  @Permissions("ai.chat")
  async chat(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() dto: ChatDto) {
    return this.ai.chat({ userId: user.sub, organizationId: orgId, conversationId: dto.conversationId, prompt: dto.prompt, systemPrompt: dto.systemPrompt });
  }

  @Get("conversations")
  @Permissions("ai.chat")
  async conversations(@AuthUser() user: AccessTokenPayload) {
    return this.ai.listConversations(user.sub);
  }

  @Get("usage")
  @Permissions("ai.usage.read")
  async usage(@CurrentOrganization() orgId: string) {
    return this.ai.usageReport(orgId!);
  }

  @Get("prompts")
  @Permissions("ai.prompt.manage")
  async prompts(@CurrentOrganization() orgId: string) {
    return this.ai.listPrompts(orgId);
  }

  @Post("prompts")
  @Permissions("ai.prompt.manage")
  async createPrompt(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() body: any) {
    return this.ai.createPrompt({ ...body, organizationId: orgId, createdBy: user.sub });
  }
}
