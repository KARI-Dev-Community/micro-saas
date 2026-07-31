import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  constructor(private readonly config: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== "http") return next.handle();

    const res = context.switchToHttp().getResponse<Response>();
    const cfg = this.config.get<{
      hstsMaxAge: number;
      hstsIncludeSubdomains: boolean;
      hstsPreload: boolean;
      cspPolicy: string;
      xContentTypeOptions: string;
      xFrameOptions: string;
      xXssProtection: string;
      referrerPolicy: string;
      permissionsPolicy: string;
    }>("security.headers");

    if (!cfg) return next.handle();

    res.setHeader("Strict-Transport-Security", this.buildHsts(cfg));
    res.setHeader("Content-Security-Policy", cfg.cspPolicy);
    res.setHeader("X-Content-Type-Options", cfg.xContentTypeOptions);
    res.setHeader("X-Frame-Options", cfg.xFrameOptions);
    res.setHeader("X-XSS-Protection", cfg.xXssProtection);
    res.setHeader("Referrer-Policy", cfg.referrerPolicy);
    res.setHeader("Permissions-Policy", cfg.permissionsPolicy);
    res.removeHeader("X-Powered-By");
    res.removeHeader("Server");

    return next.handle();
  }

  private buildHsts(cfg: {
    hstsMaxAge: number;
    hstsIncludeSubdomains: boolean;
    hstsPreload: boolean;
  }): string {
    const parts = [`max-age=${cfg.hstsMaxAge}`];
    if (cfg.hstsIncludeSubdomains) parts.push("includeSubDomains");
    if (cfg.hstsPreload) parts.push("preload");
    return parts.join("; ");
  }
}