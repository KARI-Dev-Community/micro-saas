import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

export const CsrfProtect = () => SetMetadata("csrf", true);
export const CsrfSkip = () => SetMetadata("csrf", false);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>("csrf", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip === false) return true;

    const isPublic = this.reflector.getAllAndOverride("public", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const cfg = this.config.get<{
      enabled: boolean;
      cookieName: string;
      cookieSecure: boolean;
      cookieSameSite: string;
      cookieHttpOnly: boolean;
    }>("security.csrf");

    if (!cfg?.enabled) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();

    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

    const cookieToken = this.getTokenFromCookie(req, cfg.cookieName);
    const headerToken = req.headers["x-csrf-token"] as string | undefined;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException("CSRF token mismatch");
    }

    return true;
  }

  private getTokenFromCookie(req: Request, name: string): string | null {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  }
}