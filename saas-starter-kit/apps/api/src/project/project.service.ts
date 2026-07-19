import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Project } from "./entities/project.entity";
import { Task } from "./entities/task.entity";
import { TaskComment } from "./entities/task-comment.entity";
import { Activity } from "./entities/activity.entity";
import { Subscription } from "../billing/entities/subscription.entity";
import { RbacService } from "../tenant/rbac.service";
import { AuditService } from "../audit/audit.service";
import { ConfigService } from "@nestjs/config";
import { PlanType } from "@shared/enums";
import { SearchService } from "../search/search.service";
import { parsePagination, toPaginated, PaginationParams } from "../core/pagination";
import { BusinessException } from "../core/exception/business.exception";
import { Permission } from "@shared/enums";

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(TaskComment) private readonly comments: Repository<TaskComment>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly search: SearchService
  ) {}

  private async assertPlan(organizationId: string, userId: string, perm: Permission) {
    await this.rbac.assertPermission(userId, organizationId, perm);
  }

  async listProjects(organizationId: string, userId: string, query: Record<string, any>) {
    await this.assertPlan(organizationId, userId, Permission.PROJECT_READ);
    const p: PaginationParams = parsePagination(query);
    const qb = this.projects.createQueryBuilder("p").where("p.organizationId = :orgId", { orgId: organizationId });
    if (p.search) qb.andWhere("p.name ILIKE :q", { q: `%${p.search}%` });
    if (p.filters.status) qb.andWhere("p.status = :status", { status: p.filters.status });
    const [items, total] = await qb.orderBy(`p.${p.sort?.field ?? "createdAt"}`, p.sort?.order ?? "DESC").skip(p.skip).take(p.limit).getManyAndCount();
    return toPaginated(items, total, p);
  }

  async createProject(input: { organizationId: string; userId: string; name: string; description?: string; workspaceId?: string; ownerId?: string }) {
    await this.assertPlan(input.organizationId, input.userId, Permission.PROJECT_CREATE);
    // Free-tier cap.
    const sub = await this.subs.findOne({ where: { organizationId: input.organizationId } });
    if (sub?.plan === PlanType.FREE) {
    const limit = this.config.get<number>("app.billing.freeProjectLimit") ?? 3;
      const count = await this.projects.count({ where: { organizationId: input.organizationId } });
      if (count >= limit) {
        throw new BusinessException(`Free plan limited to ${limit} projects. Upgrade to create more.`, "LIMIT_REACHED");
      }
    }
    const project = await this.projects.save(this.projects.create(input));
    await this.activities.save(this.activities.create({ organizationId: input.organizationId, projectId: project.id, actorId: input.userId, type: "created", message: `Created project ${project.name}` }));
    await this.search.index({ tenantId: input.organizationId, entityType: "project", entityId: project.id, title: project.name, body: project.description ?? null, module: "project" });
    await this.audit.record("project", "created", { actorId: input.userId, organizationId: input.organizationId }, { entityType: "project", entityId: project.id });
    return project;
  }

  async createTask(input: { organizationId: string; userId: string; projectId: string; title: string; description?: string; status?: string; priority?: string; assigneeId?: string; dueDate?: Date }) {
    await this.assertPlan(input.organizationId, input.userId, Permission.PROJECT_TASK_CREATE);
    const task = await this.tasks.save(
      this.tasks.create({
        organizationId: input.organizationId,
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
        status: (input.status as any) ?? "todo",
        priority: (input.priority as any) ?? "medium",
        assigneeId: input.assigneeId ?? null,
        dueDate: input.dueDate ?? null,
      })
    );
    await this.activities.save(this.activities.create({ organizationId: input.organizationId, projectId: input.projectId, taskId: task.id, actorId: input.userId, type: "created", message: `Created task ${task.title}` }));
    return task;
  }

  async listTasks(projectId: string, organizationId: string, userId: string, query: Record<string, any>) {
    await this.assertPlan(organizationId, userId, Permission.PROJECT_TASK_READ);
    const p: PaginationParams = parsePagination(query);
    const qb = this.tasks.createQueryBuilder("t").where("t.projectId = :pid", { pid: projectId });
    if (p.filters.status) qb.andWhere("t.status = :status", { status: p.filters.status });
    if (p.filters.assigneeId) qb.andWhere("t.assigneeId = :assignee", { assignee: p.filters.assigneeId });
    const [items, total] = await qb.orderBy(`t.${p.sort?.field ?? "createdAt"}`, p.sort?.order ?? "DESC").skip(p.skip).take(p.limit).getManyAndCount();
    return toPaginated(items, total, p);
  }

  async comment(input: { organizationId: string; userId: string; taskId: string; content: string }) {
    const task = await this.tasks.findOne({ where: { id: input.taskId } });
    if (!task) throw new NotFoundException("Task not found");
    const comment = await this.comments.save(this.comments.create({ taskId: input.taskId, authorId: input.userId, content: input.content }));
    await this.activities.save(this.activities.create({ organizationId: input.organizationId, taskId: input.taskId, actorId: input.userId, type: "commented", message: input.content.slice(0, 120) }));
    return comment;
  }

  async activityTimeline(organizationId: string, query: Record<string, any>) {
    const p: PaginationParams = parsePagination(query);
    const qb = this.activities.createQueryBuilder("a").where("a.organizationId = :orgId", { orgId: organizationId });
    const [items, total] = await qb.orderBy("a.createdAt", "DESC").skip(p.skip).take(p.limit).getManyAndCount();
    return toPaginated(items, total, p);
  }
}
