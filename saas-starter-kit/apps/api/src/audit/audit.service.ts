import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "../audit/entities/audit-log.entity";
import { AccessTokenPayload } from "../auth/services/token.service";
import { QueueRegistry, QUEUE_NAMES } from "../core/queue/queue.registry";

export interface AuditContext {
  actorId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
    private readonly queues: QueueRegistry
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
    const payload = {
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
    };
    try {
      await this.queues.add(QUEUE_NAMES.AUDIT, "save", payload);
    } catch {
      await this.repo.save(this.repo.create(payload));
    }
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
