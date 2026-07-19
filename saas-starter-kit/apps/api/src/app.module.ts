import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { AppDataSource } from "./config/typeorm-cli";
import appConfig from "./config/app.config";
import { ResponseInterceptor } from "./core/response/response.interceptor";
import { AllExceptionsFilter } from "./core/exception/exception.filter";
import { RequestLoggingInterceptor } from "./core/logging/request-logging.interceptor";
import { PermissionGuard } from "./core/guards/permission.guard";
import { JwtAuthGuard } from "./core/guards/jwt-auth.guard";
import { HealthController } from "./core/health/health.controller";
import { RedisModule } from "./core/redis/redis.module";
import { QueueModule } from "./core/queue/queue.module";
import { AuthModule } from "./auth/auth.module";
import { TenantModule } from "./tenant/tenant.module";
import { BillingModule } from "./billing/billing.module";
import { UserModule } from "./user/user.module";
import { NotificationModule } from "./notification/notification.module";
import { FileModule } from "./file/file.module";
import { SearchModule } from "./search/search.module";
import { AiModule } from "./ai/ai.module";
import { ProjectModule } from "./project/project.module";
import { AdminModule } from "./admin/admin.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AuditModule } from "./audit/audit.module";
import { EmailModule } from "./email/email.module";
import { WorkerModule } from "./workers/worker.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    TypeOrmModule.forRoot(AppDataSource.options),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    RedisModule,
    QueueModule,
    AuditModule,
    EmailModule,
    AuthModule,
    TenantModule,
    BillingModule,
    UserModule,
    NotificationModule,
    FileModule,
    SearchModule,
    AiModule,
    ProjectModule,
    AdminModule,
    DashboardModule,
    WorkerModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // JWT auth resolves req.user globally; PermissionGuard enforces RBAC per-route.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
