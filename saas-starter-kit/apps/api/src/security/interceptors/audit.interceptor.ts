import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AuditService } from "../../audit/audit.service";
import { AccessTokenPayload } from "../../auth/services/token.service";

const PII_FIELDS = new Set([
  "password",
  "passwordHash",
  "passwordResetToken",
  "emailVerificationToken",
  "twoFactorSecret",
  "credentialId",
  "publicKey",
  "token",
  "refreshToken",
  "accessToken",
  "authorization",
  "cookie",
  "set-cookie",
]);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger("Audit");

  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== "http") return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const user = req.user as AccessTokenPayload | undefined;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const latency = Date.now() - start;
          const statusCode = res.statusCode;
          this.logEvent(req, user, statusCode, latency);
        },
        error: (err: any) => {
          const latency = Date.now() - start;
          const statusCode = err?.status ?? 500;
          this.logEvent(req, user, statusCode, latency, err?.message);
        },
      })
    );
  }

  private logEvent(
    req: Request,
    user: AccessTokenPayload | undefined,
    statusCode: number,
    latency: number,
    errorMsg?: string
  ): void {
    const organizationId =
      (req.headers["x-organization-id"] as string) || user?.organizationId;

    const sanitizedBody = this.sanitize(req.body);
    const sanitizedParams = this.sanitize(req.params);

    this.logger.log(
      `${req.method} ${req.originalUrl} -> ${statusCode} (${latency}ms) [org=${organizationId ?? "none"} user=${user?.sub ?? "anonymous"}]`
    );

    if (organizationId && user) {
      this.audit.record(
        req.route?.controller?.name ?? req.route?.path ?? "unknown",
        req.method.toLowerCase(),
        {
          actorId: user.sub,
          organizationId,
          ipAddress: this.getClientIp(req),
          userAgent: req.headers["user-agent"] as string | undefined,
        },
        {
          entityType: req.route?.path ?? "unknown",
          entityId:
            (sanitizedParams.id as string | undefined) ??
            (sanitizedParams.taskId as string | undefined) ??
            undefined,
          oldValue: {
            path: req.originalUrl,
            statusCode,
            latency,
            bodyKeys: Object.keys(sanitizedBody),
            error: errorMsg,
          },
        },
      );
    }
  }

  private sanitize(obj: unknown): Record<string, unknown> {
    if (!obj || typeof obj !== "object") return {};
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (PII_FIELDS.has(key.toLowerCase())) {
        result[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        result[key] = this.sanitize(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"] as string | undefined;
    if (forwarded) return forwarded.split(",")[0].trim();
    return req.socket.remoteAddress ?? "unknown";
  }
}