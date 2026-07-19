import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { User } from "../entities/user.entity";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  organizationId?: string;
  // permissions resolved at token issuance (kept fresh via re-login/refresh)
  perms: string[];
  sid?: string; // session id (jti of refresh token)
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async signAccessToken(user: User, perms: string[], organizationId?: string, sid?: string): Promise<TokenPair> {
    const accessSecret = this.config.getOrThrow<string>("app.jwtSecret");
    const accessExpires = this.config.get<string>("app.jwtAccessExpiresIn") ?? "15m";
    const refreshExpires = this.config.get<string>("app.jwtRefreshExpiresIn");

    const tokenId = randomJti();

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, organizationId, perms, sid } as AccessTokenPayload,
      { secret: accessSecret, expiresIn: accessExpires }
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: tokenId },
      { secret: accessSecret, expiresIn: refreshExpires }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: parseExpiry(accessExpires),
    };
  }

  async verify(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>("app.jwtSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}

function randomJti(): string {
  return randomUUID();
}

function parseExpiry(expr: string): number {
  const m = /^(\d+)\s*(s|m|h|d)$/.exec(expr.trim());
  if (!m) return 900;
  const n = parseInt(m[1], 10);
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[m[2]] ?? 1;
  return n * mult;
}
