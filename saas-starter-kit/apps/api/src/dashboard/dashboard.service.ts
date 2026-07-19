import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Subscription } from "../billing/entities/subscription.entity";
import { Organization } from "../tenant/entities/organization.entity";
import { Project } from "../project/entities/project.entity";
import { Task } from "../project/entities/task.entity";
import { AiUsage } from "../ai/entities/ai-usage.entity";
import { Permission } from "@shared/enums";
import { RbacService } from "../tenant/rbac.service";
import { TaskStatus } from "../project/entities/project.entity";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    @InjectRepository(Organization) private readonly orgs: Repository<Organization>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(AiUsage) private readonly usage: Repository<AiUsage>,
    private readonly rbac: RbacService
  ) {}

  async orgDashboard(organizationId: string, userId: string): Promise<Record<string, unknown>> {
    await this.rbac.assertPermission(userId, organizationId, Permission.DASHBOARD_READ);
    const [projects, tasks, openTasks] = await Promise.all([
      this.projects.count({ where: { organizationId } }),
      this.tasks.count({ where: { organizationId } }),
      this.tasks.count({ where: { organizationId, status: TaskStatus.TODO } }),
    ]);
    return { projects, tasks, openTasks };
  }

  async revenue(organizationId: string, userId: string): Promise<Record<string, unknown>> {
    await this.rbac.assertPermission(userId, organizationId, Permission.ANALYTICS_REVENUE_READ);
    const subs = await this.subs.find({ where: { organizationId } });
    const mrr = subs
      .filter((s) => s.status === "active" && s.amountCents)
      .reduce((sum, s) => sum + (s.amountCents ?? 0), 0);
    return { mrrCents: mrr, currency: subs[0]?.currency ?? "usd", subscriptions: subs.length };
  }

  async userAnalytics(organizationId: string, userId: string): Promise<Record<string, unknown>> {
    await this.rbac.assertPermission(userId, organizationId, Permission.ANALYTICS_USER_READ);
    const members = await this.orgs
      .createQueryBuilder("o")
      .relation(Organization, "memberships")
      .of(organizationId)
      .loadMany();
    return { members: (members as any[]).length };
  }

  async aiSpend(organizationId: string): Promise<{ totalUsd: number; requests: number }> {
    const rows = await this.usage.find({ where: { organizationId } });
    return {
      totalUsd: rows.reduce((s, r) => s + Number(r.costUsd), 0),
      requests: rows.reduce((s, r) => s + r.requestCount, 0),
    };
  }
}
