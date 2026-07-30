# API App — AI Context

NestJS backend for the SaaS starter kit.

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/auth/` | Authentication, JWT, sessions, passkeys, 2FA, Google OAuth |
| `src/tenant/` | Organizations, workspaces, teams, memberships, RBAC |
| `src/user/` | Profiles, preferences, notification settings |
| `src/project/` | Projects, tasks, task comments, activity timeline |
| `src/ai/` | AI chat, prompts, conversation history, usage/cost tracking |
| `src/billing/` | Subscriptions, invoices, coupons |
| `src/file/` | Uploads, presigned URLs, versioning |
| `src/search/` | Global full-text search |
| `src/notification/` | In-app notifications |
| `src/admin/` | Platform admin, feature flags |
| `src/dashboard/` | KPIs, revenue, user analytics |
| `src/core/` | Guards, interceptors, filters, queue, health, logging |
| `src/workers/` | BullMQ consumers |
| `src/email/` | Transactional email service |
| `src/database/migrations/` | TypeORM migrations |
| `src/common/` | Shared utilities |

## Patterns

### New Module
1. Entity with `organizationId` + `@Index()` in `entities/`
2. DTOs with `class-validator` in `dto/`
3. Service with `@Injectable()`, scoped by `organizationId`
4. Controller with `@Controller()`, `@UseGuards(PermissionGuard)`, `@Permissions(...)`
5. Module importing TypeOrmModule, registering service/controller
6. Register module in `AppModule`

### Controller
```ts
@Controller("features")
@UseGuards(PermissionGuard)
export class FeatureController {
  @Get()
  @Permissions(Permission.FEATURE_READ)
  async list(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload) {
    return this.svc.list(orgId!, user.sub, {} as any);
  }
}
```

### Response
- Always return `ok(data)` or `fail(message)` from `@shared/response`
- Envelope: `{ success, message, data, meta }`

### Permissions
- Add to `Permission` enum in `packages/shared/src/enums.ts`
- Grant in `ROLE_PERMISSIONS` for relevant roles
- Protect route with `@Permissions(Permission.XXX)`

### Background Jobs
```ts
await this.queues.add(QUEUE_NAMES.EMAIL, "send", payload, { attempts: 3 });
```

### Audit Logging
```ts
await this.audit.record("project", "created", { actorId: user.sub, organizationId }, {
  entityType: "project", entityId: project.id,
});
```

## Do Not
- Use `@UseGuards(JwtAuthGuard)` — it's global
- Trust client-supplied IDs without `organizationId` scoping
- Skip migrations when changing the schema
- Add `NEXT_PUBLIC_` to server-only env vars