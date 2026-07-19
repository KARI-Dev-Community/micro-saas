import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from "@nestjs/common";
import { JwtAuthGuard, AuthUser } from "../core/guards/jwt-auth.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { NotificationService } from "./notification.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get()
  async list(@AuthUser() user: AccessTokenPayload, @Query("unread") unread?: string) {
    return this.svc.list(user.sub, unread === "true");
  }

  @Get("unread-count")
  async count(@AuthUser() user: AccessTokenPayload) {
    return { count: await this.svc.unreadCount(user.sub) };
  }

  @Patch(":id/read")
  async read(@AuthUser() user: AccessTokenPayload, @Param("id") id: string) {
    await this.svc.markRead(id, user.sub);
    return { read: true };
  }

  @Post("read-all")
  async readAll(@AuthUser() user: AccessTokenPayload) {
    await this.svc.markAllRead(user.sub);
    return { read: true };
  }
}
