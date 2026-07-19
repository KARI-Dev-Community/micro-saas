import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Subscription } from "../billing/entities/subscription.entity";
import { Organization } from "../tenant/entities/organization.entity";
import { Project } from "../project/entities/project.entity";
import { Task } from "../project/entities/task.entity";
import { AiUsage } from "../ai/entities/ai-usage.entity";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { TenantModule } from "../tenant/tenant.module";
import { ProjectModule } from "../project/project.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Organization, Project, Task, AiUsage]),
    TenantModule,
    ProjectModule,
    AiModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
