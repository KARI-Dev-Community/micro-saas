import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Subscription } from "../billing/entities/subscription.entity";
import { Project } from "../project/entities/project.entity";
import { Task } from "../project/entities/task.entity";
import { AiUsage } from "../ai/entities/ai-usage.entity";
import { Membership } from "../tenant/entities/membership.entity";
import { TaskStatus } from "../project/entities/project.entity";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(AiUsage) private readonly usage: Repository<AiUsage>,
    @InjectRepository(Membership) private readonly memberships: Repository<Membership>
  ) {}

  async orgDashboard(organizationId: string): Promise<Record<string, unknown>> {
    const [projects, tasks, openTasks] = await Promise.all([
      this.projects.count({ where: { organizationId } }),
      this.tasks.count({ where: { organizationId } }),
      this.tasks.count({ where: { organizationId, status: TaskStatus.TODO } }),
    ]);
    return { projects, tasks, openTasks };
  }

  async revenue(organizationId: string): Promise<Record<string, unknown>> {
    const subs = await this.subs.find({ where: { organizationId } });
    const mrr = subs
      .filter((s) => s.status === "active" && s.amountCents)
      .reduce((sum, s) => sum + (s.amountCents ?? 0), 0);
    return { mrrCents: mrr, currency: subs[0]?.currency ?? "usd", subscriptions: subs.length };
  }

  async userAnalytics(organizationId: string): Promise<Record<string, unknown>> {
    const count = await this.memberships.count({ where: { organizationId } });
    return { members: count };
  }

  async aiSpend(organizationId: string): Promise<{ totalUsd: number; requests: number }> {
    const result = await this.usage
      .createQueryBuilder("u")
      .select("SUM(u.costUsd)", "totalUsd")
      .addSelect("SUM(u.requestCount)", "requests")
      .where("u.organizationId = :orgId", { orgId: organizationId })
      .getRawOne();
    return {
      totalUsd: Number(result?.totalUsd ?? 0),
      requests: Number(result?.requests ?? 0),
    };
  }
}
