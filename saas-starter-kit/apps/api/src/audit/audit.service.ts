import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "../audit/entities/audit-log.entity";
import { AccessTokenPayload } from "../auth/services/token.service";

export interface AuditContext {
  actorId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Append-only audit logging. Call from services after a successful mutation.
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>
  ) {}

  async record(
    module: string,
    action: string,
    ctx: AuditContext,
    extra?: {
      entityType?: string;
      entityId?: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
    }
  ): Promise<void> {
    const log = this.repo.create({
      module,
      action,
      actorId: ctx.actorId ?? null,
      organizationId: ctx.organizationId ?? null,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      entityType: extra?.entityType ?? null,
      entityId: extra?.entityId ?? null,
      oldValue: extra?.oldValue ?? null,
      newValue: extra?.newValue ?? null,
    });
    await this.repo.save(log);
  }

  fromRequest(req: any, user?: AccessTokenPayload): AuditContext {
    return {
      actorId: user?.sub,
      organizationId: user?.organizationId,
      ipAddress: req.ip || req.headers["x-forwarded-for"],
      userAgent: req.headers["user-agent"],
    };
  }
}
