import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Query,
  Req,
  Res,
  Inject,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./services/auth.service";
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from "./dto/auth.dto";
import { AuthUser, CurrentOrganization } from "../core/guards/jwt-auth.guard";
import { AccessTokenPayload } from "./services/token.service";
import { Public } from "../core/guards/jwt-auth.guard";
import { ConfigService } from "@nestjs/config";
import { RbacService } from "../tenant/rbac.service";
import { Permission } from "@shared/enums";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService, private readonly rbac: RbacService) {}

  private clientCtx(req: Request) {
    return {
      ip: (req.ip as string) || (req.headers["x-forwarded-for"] as string) || "0.0.0.0",
      ua: req.headers["user-agent"] || "",
      device: (req.headers["x-device-name"] as string) || undefined,
    };
  }

  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string; expiresIn: number }) {
    const isProd = this.config.get("app.env") === "production";
    const cookieBase = {
      httpOnly: true,
      sameSite: "strict",
      secure: isProd,
      path: "/",
    } as any;
    res.cookie("saas_access_token", tokens.accessToken, {
      ...cookieBase,
      maxAge: tokens.expiresIn * 1000,
    });
    res.cookie("saas_refresh_token", tokens.refreshToken, {
      ...cookieBase,
      maxAge: 30 * 24 * 3600 * 1000,
    });
  }

  @Post("register")
  @Public()
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const user = await this.auth.register(dto, this.clientCtx(req));
    return { user: { id: user.id, email: user.email, status: user.status } };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Public()
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const result = await this.auth.login(dto.email, dto.password, this.clientCtx(req));
      this.setAuthCookies(res, result);
      return { accessToken: result.accessToken, refreshToken: result.refreshToken, expiresIn: result.expiresIn, user: result.user };
    } catch (e: any) {
      if (e instanceof Error && "userId" in e && e.message === "Two-factor authentication required") {
        return { twoFactorRequired: true, userId: (e as any).userId };
      }
      throw e;
    }
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = parseCookie(req.headers.cookie, "saas_refresh_token");
    if (!refreshToken) throw new UnauthorizedException();
    const result = await this.auth.refresh(refreshToken);
    this.setAuthCookies(res, result);
    return { accessToken: result.accessToken, refreshToken: result.refreshToken, expiresIn: result.expiresIn };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = parseCookie(req.headers.cookie, "saas_refresh_token");
    if (refreshToken) await this.auth.logout(refreshToken);
    res.clearCookie("saas_access_token", { path: "/" });
    res.clearCookie("saas_refresh_token", { path: "/" });
    return { loggedOut: true };
  }

  @Post("logout-all")
  async logoutAll(@AuthUser() user: AccessTokenPayload, @Res({ passthrough: true }) res: Response) {
    await this.auth.logoutAll(user.sub);
    res.clearCookie("saas_access_token", { path: "/" });
    res.clearCookie("saas_refresh_token", { path: "/" });
    return { loggedOut: true };
  }

  @Get("verify-email")
  @Public()
  async verifyEmail(@Query("token") token: string, @Res() res: Response) {
    await this.auth.verifyEmail(token);
    return res.redirect(`${this.config.get("app.frontendUrl")}/login?verified=1`);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Public()
  async forgot(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { message: "If the email exists, a reset link was sent." };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Public()
  async reset(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { message: "Password updated" };
  }

  @Post("change-password")
  async change(@AuthUser() user: AccessTokenPayload, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.sub, dto.current, dto.next);
    return { message: "Password changed" };
  }

  @Get("me")
  async me(@AuthUser() user: AccessTokenPayload, @CurrentOrganization() orgId: string) {
    let permissions = user.perms;
    if (orgId) {
      try {
        const resolved = await this.rbac.getUserPermissions(user.sub, orgId);
        permissions = resolved.permissions;
      } catch {
        if (await this.rbac.isSuperAdmin(user.sub)) {
          permissions = Object.values(Permission);
        }
      }
    } else if (await this.rbac.isSuperAdmin(user.sub)) {
      permissions = Object.values(Permission);
    }
    return { id: user.sub, email: user.email, organizationId: orgId || user.organizationId, permissions };
  }
}

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
