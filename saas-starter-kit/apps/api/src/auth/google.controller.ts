import { Controller, Get, Query, Req, Res, Post, Body, UseGuards, HttpCode } from "@nestjs/common";
import { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./services/auth.service";
import { TokenService } from "./services/token.service";
import { JwtAuthGuard, AuthUser } from "../core/guards/jwt-auth.guard";
import { AccessTokenPayload } from "./services/token.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { AuthProvider, UserStatus } from "@shared/enums";

// Google OAuth2 (authorization code flow). In production wire a provider
// library; here we implement token exchange + user upsert directly.
@Controller("auth/google")
export class GoogleController {
  constructor(
    private readonly config: ConfigService,
    private readonly auth: AuthService,
    private readonly token: TokenService,
    @InjectRepository(User) private readonly users: Repository<User>
  ) {}

  @Get("login")
  redirectToGoogle(@Res() res: Response) {
    const clientId = this.config.get("app.googleClientId");
    const redirect = `${this.config.get("app.frontendUrl")}/oauth/google`;
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?response_type=code` +
      `&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}` +
      `&scope=openid%20email%20profile`;
    return res.redirect(url);
  }

  @Get("callback")
  async callback(@Query("code") code: string, @Res() res: Response) {
    const { id_token, email, name } = await this.exchange(code);
    let user = await this.auth.findByEmail(email);
    if (!user) {
      user = this.users.create({
        email,
        provider: AuthProvider.GOOGLE,
        providerId: id_token,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      });
      await this.users.save(user);
    }
    const tokens = await this.auth.issueTokens(user, { ip: "0.0.0.0", ua: "" });
    return res.redirect(
      `${this.config.get("app.frontendUrl")}/oauth/callback?access=${tokens.accessToken}&refresh=${tokens.refreshToken}`
    );
  }

  private async exchange(code: string): Promise<{ id_token: string; email: string; name: string }> {
    const clientId = this.config.get("app.googleClientId");
    const secret = this.config.get("app.googleClientSecret");
    const redirect = `${this.config.get("app.frontendUrl")}/oauth/google`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: secret,
        redirect_uri: redirect,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = (await tokenRes.json()) as any;
    const payload = JSON.parse(
      Buffer.from(tokenJson.id_token.split(".")[1], "base64").toString()
    );
    return { id_token: tokenJson.id_token, email: payload.email, name: payload.name };
  }
}
