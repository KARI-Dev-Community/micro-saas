import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard, AuthUser } from "../core/guards/jwt-auth.guard";
import { AccessTokenPayload } from "./services/token.service";
import { TwoFactorService } from "./services/two-factor.service";
import { AuthService } from "./services/auth.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Session } from "./entities/session.entity";
import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

class TotpConfirmDto {
  @ApiProperty() @IsString() code!: string;
}
class PasskeyRegisterDto {
  @ApiProperty() @IsString() credentialId!: string;
  @ApiProperty() @IsString() publicKey!: string;
  @ApiProperty() @IsOptional() @IsString() deviceName?: string;
  @ApiProperty() @IsOptional() @IsString() transports?: string;
  // `counter` is returned by the WebAuthn client after registration.
  @ApiProperty() counter!: number;
}

@Controller("auth/security")
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(
    private readonly twoFactor: TwoFactorService,
    private readonly auth: AuthService,
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>
  ) {}

  @Post("2fa/enable")
  async enable2fa(@AuthUser() user: AccessTokenPayload) {
    return this.twoFactor.enableTotp(user.sub);
  }

  @Post("2fa/confirm")
  @HttpCode(HttpStatus.OK)
  async confirm2fa(@AuthUser() user: AccessTokenPayload, @Body() dto: TotpConfirmDto) {
    await this.twoFactor.confirmTotp(user.sub, dto.code);
    return { enabled: true };
  }

  @Post("2fa/disable")
  @HttpCode(HttpStatus.OK)
  async disable2fa(@AuthUser() user: AccessTokenPayload) {
    await this.twoFactor.disableTotp(user.sub);
    return { disabled: true };
  }

  @Get("sessions")
  async listSessions(@AuthUser() user: AccessTokenPayload) {
    const rows = await this.sessionRepo.find({
      where: { userId: user.sub, isActive: true },
      order: { lastActivityAt: "DESC" },
    });
    return rows.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      deviceType: s.deviceType,
      browser: s.browser,
      os: s.os,
      ipAddress: s.ipAddress,
      location: s.location,
      current: s.current,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  @Delete("sessions/:id")
  @HttpCode(HttpStatus.OK)
  async revokeSession(@AuthUser() user: AccessTokenPayload, @Param("id") id: string) {
    await this.sessionRepo.update({ id, userId: user.sub }, { isActive: false, current: false });
    return { revoked: true };
  }

  @Delete("sessions")
  @HttpCode(HttpStatus.OK)
  async revokeOthers(@AuthUser() user: AccessTokenPayload, @Req() req: Request) {
    const auth = req.headers["authorization"]?.replace("Bearer ", "");
    // keep current session; revoke all others
    await this.auth.logoutAll(user.sub);
    return { revoked: true };
  }

  @Get("passkeys")
  async passkeys(@AuthUser() user: AccessTokenPayload) {
    const pks = await this.twoFactor.listPasskeys(user.sub);
    return pks.map((p) => ({ id: p.id, deviceName: p.deviceName, createdAt: p.createdAt, lastUsedAt: p.lastUsedAt }));
  }

  @Post("passkeys")
  async addPasskey(@AuthUser() user: AccessTokenPayload, @Body() dto: PasskeyRegisterDto) {
    const pk = await this.twoFactor.registerPasskey({
      userId: user.sub,
      credentialId: dto.credentialId,
      publicKey: dto.publicKey,
      counter: dto.counter,
      deviceName: dto.deviceName,
      transports: dto.transports,
    });
    return { id: pk.id };
  }

  @Delete("passkeys/:id")
  @HttpCode(HttpStatus.OK)
  async removePasskey(@AuthUser() user: AccessTokenPayload, @Param("id") id: string) {
    await this.twoFactor.removePasskey(user.sub, id);
    return { removed: true };
  }
}
