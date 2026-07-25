# AI Coding Guide — SaaS Starter Kit

Read this file before making changes. It is the single source of truth for how this codebase is structured and how to extend it safely.

## Architecture (30-second version)

- **Backend** — NestJS modules under `apps/api/src/`. Each feature = 1 module: `controller.ts`, `service.ts`, `dto/`, `entities/`, `module.ts`.
- **Frontend** — Next.js App Router under `apps/web/src/app/`.
- **Shared contracts** — `packages/shared/src/` exports `Permission`, `RoleName`, `PlanType`, `ok()`, `fail()`, `ApiResponse`.
- **Responses** — Every API response uses envelope `{ success, message, data, meta }`. Backend returns via `ok()`/`fail()`. Frontend unwraps with `api-client.ts`.
- **Multi-tenant** — Every entity carries `organizationId`. Tenant-scoped routes require `x-organization-id` header. Use `@CurrentOrganization()` decorator.

## Global Rules

1. **Never create a new global module.** Add feature modules to `AppModule` imports only.
2. **Never trust client-supplied IDs.** Always scope queries by `organizationId` + authenticated `userId`.
3. **Never expose server-only env vars to the client.** No `NEXT_PUBLIC_` prefix for secrets.
4. **Public endpoints need `@Public()`** (from `core/guards/jwt-auth.guard`). Everything else is protected by the global `JwtAuthGuard`.
5. **Protected endpoints need `@Permissions(...)`** (from `core/guards/permission.guard`). `PermissionGuard` is also global.
6. **Never use `@UseGuards(JwtAuthGuard)`** — it is redundant. The guard is already global.
7. **Always use `@shared/enums`** for `Permission`, `RoleName`, `PlanType`, `SubscriptionStatus`, etc.
8. **Always use `@shared/response`** for `ok()`, `fail()`, `toPaginated()`.

## Standard Patterns (copy exactly)

### New backend endpoint
```ts
// 1. DTO in dto/
export class CreateWidgetDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsOptional() @IsString() description?: string;
}

// 2. Service method
async create(organizationId: string, userId: string, dto: CreateWidgetDto) {
  const w = this.repo.create({ organizationId, ...dto });
  return this.repo.save(w);
}

// 3. Controller route
@Post()
@Permissions(Permission.WIDGET_CREATE)
async create(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() dto: CreateWidgetDto) {
  return this.service.create(orgId!, user.sub, dto);
}
```

### New TypeORM entity
```ts
@Entity("widgets")
export class Widget extends BaseEntity {
  @PrimaryColumn("uuid") id!: string;
  @Index() @Column("uuid") organizationId!: string;
  @Column("varchar") name!: string;
  @Column("timestamp") createdAt!: Date;
}
```
Generate migration: `npm run migration:generate --workspace apps/api -- name=AddWidgets`

### New frontend page
```tsx
// app/dashboard/widgets/page.tsx
import { api } from "@/lib/api-client";
import { Can } from "@/components/providers";

export default async function WidgetsPage() {
  const data = await api.get("/api/widgets", { organizationId });
  return (
    <Can permission={Permission.WIDGET_READ}>
      <ul>{data.items.map(i => <li key={i.id}>{i.name}</li>)}</ul>
    </Can>
  );
}
```

### Background job (BullMQ)
```ts
await this.queues.add(QUEUE_NAMES.EMAIL, "send", payload, { attempts: 3 });

@Processor("email")
export class EmailConsumer extends WorkerHost {
  async process(job: Job) { /* deliver */ }
}
```

## File Locations Cheat Sheet

| What | Where |
|------|-------|
| Auth controller | `apps/api/src/auth/auth.controller.ts` |
| Tenant/org controller | `apps/api/src/tenant/tenant.controller.ts` |
| Global guards | `apps/api/src/core/guards/` |
| Response helpers | `packages/shared/src/response.ts` |
| Permission enum | `packages/shared/src/enums.ts` |
| Frontend API client | `apps/web/src/lib/api-client.ts` |
| Auth store (Zustand) | `apps/web/src/lib/auth-store.ts` |
| RBAC `<Can>` component | `apps/web/src/components/providers/` |

## Do Not

- Create new global data-access modules. Use `apps/api/src/auth/` (users/sessions) and `apps/api/src/tenant/` (orgs/memberships) plus feature modules.
- Change `sentry.server.config.ts` / `sentry.edge.config.ts` filenames if present.
- Assume `npm run build` means webhooks work — those need real signing secrets.
