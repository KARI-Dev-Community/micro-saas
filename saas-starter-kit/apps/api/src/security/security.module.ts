import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerGuard } from "@nestjs/throttler";
import { JwtAuthGuard } from "../core/guards/jwt-auth.guard";
import { PermissionGuard } from "../core/guards/permission.guard";
import { ResponseInterceptor } from "../core/response/response.interceptor";
import { RequestLoggingInterceptor } from "../core/logging/request-logging.interceptor";
import { AllExceptionsFilter } from "../core/exception/exception.filter";
import { RedisModule } from "../core/redis/redis.module";
import { CsrfGuard } from "./guards/csrf.guard";
import { InternalRequestGuard } from "./guards/internal.guard";
import { SessionBindingGuard } from "./guards/session-binding.guard";
import { SecurityHeadersInterceptor } from "./interceptors/security-headers.interceptor";
import { AuditInterceptor } from "./interceptors/audit.interceptor";
import { SanitizeInterceptor } from "./interceptors/sanitize.interceptor";
import { TenantModule } from "../tenant/tenant.module";

@Module({
  imports: [ConfigModule, RedisModule, TenantModule],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: InternalRequestGuard },
    { provide: APP_GUARD, useClass: SessionBindingGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SecurityHeadersInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SanitizeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [],
})
export class SecurityModule {}