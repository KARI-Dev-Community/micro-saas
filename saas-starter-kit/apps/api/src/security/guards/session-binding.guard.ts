import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "../../core/redis/redis.service";
import { AccessTokenPayload } from "../../auth/services/token.service";

export const SessionBinding = () => SetMetadata("sessionBinding", true);

@Injectable()
export class SessionBindingGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AccessTokenPayload | undefined;

    if (!user) return true;

    const cfg = this.config.get<{
      deviceBinding: boolean;
      idleTimeoutMs: number;
      absoluteTimeoutMs: number;
      redisKeyPrefix: string;
    }>("security.session");

    if (!cfg?.deviceBinding) return true;

    const clientIp = this.getClientIp(req);
    const userAgent = req.headers["user-agent"] as string | undefined;
    const sessionId = user.sid;

    if (!sessionId) {
      throw new UnauthorizedException("Session binding required");
    }

    const redisKey = `${cfg.redisKeyPrefix}${sessionId}:binding`;

    const stored = await this.redisService.get(redisKey);
    if (!stored) {
      await this.redisService.set(
        redisKey,
        JSON.stringify({ ip: clientIp, ua: userAgent }),
        Math.ceil(cfg.absoluteTimeoutMs / 1000)
      );
      return true;
    }

    const bound = JSON.parse(stored as string);

    if (bound.ip !== clientIp) {
      await this.revokeSession(sessionId, cfg);
      throw new UnauthorizedException("Session IP mismatch");
    }

    if (bound.ua !== userAgent) {
      await this.revokeSession(sessionId, cfg);
      throw new UnauthorizedException("Session device mismatch");
    }

    await this.redisService.expire(redisKey, Math.ceil(cfg.absoluteTimeoutMs / 1000));

    return true;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"] as string | undefined;
    if (forwarded) return forwarded.split(",")[0].trim();
    return (req.socket.remoteAddress as string) ?? "unknown";
  }

  private async revokeSession(sessionId: string, cfg: any): Promise<void> {
    await this.redisService.del(`${cfg.redisKeyPrefix}${sessionId}:binding`);
    await this.redisService.del(`refresh:${sessionId}`);
  }
}