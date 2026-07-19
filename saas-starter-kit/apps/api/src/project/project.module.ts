import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Project } from "./entities/project.entity";
import { Task } from "./entities/task.entity";
import { TaskComment } from "./entities/task-comment.entity";
import { Activity } from "./entities/activity.entity";
import { ProjectService } from "./project.service";
import { ProjectController, ActivityController } from "./project.controller";
import { TenantModule } from "../tenant/tenant.module";
import { BillingModule } from "../billing/billing.module";
import { AuditModule } from "../audit/audit.module";
import { SearchModule } from "../search/search.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Task, TaskComment, Activity]),
    TenantModule,
    BillingModule,
    AuditModule,
    SearchModule,
  ],
  providers: [ProjectService],
  controllers: [ProjectController, ActivityController],
  exports: [ProjectService],
})
export class ProjectModule {}
