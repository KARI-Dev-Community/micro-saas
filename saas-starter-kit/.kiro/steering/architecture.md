# Kiro Steering: SaaS Starter Kit

This steering file guides Kiro's behavior when working with the SaaS starter kit.

## Architecture

- **Backend**: NestJS on `:3001` — modular, layered (controller → service → repo)
- **Frontend**: Next.js App Router on `:3000` — TanStack Query, React Hook Form, Zod
- **Database**: PostgreSQL with TypeORM; UUID PKs; all tenant tables have `organizationId`
- **Auth**: JWT (HS256) with refresh token rotation; global `JwtAuthGuard` + `PermissionGuard`
- **RBAC**: 6 roles (super_admin, org_owner, admin, manager, member, viewer); enum-driven permissions
- **Queue**: BullMQ with Redis for async jobs (email, notifications, AI, cleanup)

## Critical Rules

- Every tenant-scoped entity has `organizationId` + `@Index()` — never trust client-supplied IDs without scoping
- All API responses use `{ success, message, data, meta }` envelope via `ok()`/`fail()` from `@shared/response`
- Protected routes use `@Permissions(...)` (PermissionGuard) — never `@UseGuards(JwtAuthGuard)` (it's global)
- Public routes use `@Public()` from `core/guards/jwt-auth.guard`
- Frontend sends `x-organization-id` header via `api` helper
- UI authorization uses `<Can permission="...">` or `useAuthStore.hasPermission()`
- Never add `NEXT_PUBLIC_` prefix to server-only env vars
- All DTOs use `class-validator` decorators; use `ValidationPipe` (whitelist + transform)
- Migrations go in `apps/api/src/database/migrations/`; run `npm run migrate` before deploying

## File Patterns

**Backend module** (`apps/api/src/[feature]/`):
- `entities/[feature].entity.ts` — TypeORM entity with `organizationId` + `@Index()`
- `dto/create-[feature].dto.ts` / `update-[feature].dto.ts` — `class-validator` decorators
- `services/[feature].service.ts` — `@Injectable()`, scoped by `organizationId`
- `controllers/[feature].controller.ts` — `@Controller()`, `@UseGuards(PermissionGuard)`, `@Permissions(...)`
- `[feature].module.ts` — imports TypeOrmModule, registers service/controller

**Frontend feature** (`apps/web/src/app/dashboard/[feature]/`):
- `page.tsx` — TanStack Query for data fetching, React Hook Form + Zod for forms
- Uses `api.get/post/patch/del` from `lib/api-client.ts`
- Gates with `<Can permission={Permission.[FEATURE]_READ}>`

## Do Not

- Create new global modules
- Trust client-supplied IDs without scoping by `organizationId`
- Add `NEXT_PUBLIC_` to server-only env vars
- Change Sentry config filenames
- Skip TypeORM migrations when changing the schema