import { Controller, Get, Patch, Delete, Post, Body, Param, UseGuards, Query, Req } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard, AuthUser } from "../core/guards/jwt-auth.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { UserService } from "./user.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get("me/profile")
  async profile(@AuthUser() user: AccessTokenPayload) {
    return this.users.getProfile(user.sub);
  }

  @Patch("me/profile")
  async updateProfile(@AuthUser() user: AccessTokenPayload, @Body() body: any) {
    return this.users.updateProfile(user.sub, body);
  }

  @Patch("me/preferences")
  async preferences(@AuthUser() user: AccessTokenPayload, @Body() body: Record<string, unknown>) {
    return this.users.updatePreferences(user.sub, body);
  }

  @Patch("me/notification-settings")
  async notif(@AuthUser() user: AccessTokenPayload, @Body() body: Record<string, unknown>) {
    return this.users.updateNotificationSettings(user.sub, body);
  }

  @Post("me/avatar")
  async avatar(@AuthUser() user: AccessTokenPayload, @Body() body: { avatarUrl: string }) {
    return this.users.setAvatar(user.sub, body.avatarUrl);
  }

  @Post("me/deactivate")
  async deactivate(@AuthUser() user: AccessTokenPayload) {
    await this.users.deactivate(user.sub);
    return { deactivated: true };
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async delete(@Param("id") id: string, @AuthUser() user: AccessTokenPayload) {
    await this.users.delete(id, user.sub);
    return { deleted: true };
  }
}
