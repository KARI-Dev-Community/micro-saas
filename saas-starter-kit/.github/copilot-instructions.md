# SaaS Starter Kit — Copilot Instructions

This repository is a NestJS + Next.js multi-tenant SaaS boilerplate. Follow these instructions when generating or modifying code.

## Project Structure

- `apps/api/` — NestJS backend (controllers, services, entities, DTOs, migrations)
- `apps/web/` — Next.js frontend (App Router, TanStack Query, React Hook Form)
- `packages/shared/` — Shared types, enums, response utilities
- `docs/` — Architecture docs, API spec, ERD, patterns

## Backend Rules

- All tenant-scoped entities have `organizationId` (uuid) + `@Index()`
- Use `@Permissions(...)` on protected routes; `@Public()` on public routes
- Never use `@UseGuards(JwtAuthGuard)` — it is global in AppModule
- Return `ok(data)` or `fail(message)` from `@shared/response`
- DTOs use `class-validator` decorators; `ValidationPipe` is global (whitelist + transform)
- Services are `@Injectable()` and scope all queries by `organizationId`
- Enqueue background jobs via BullMQ queues (`QUEUE_NAMES.EMAIL`, etc.)
- Use `AuditService` for audit logging on create/update/delete operations

## Frontend Rules

- Use `api.get/post/patch/del` from `lib/api-client.ts` (auto-attaches Bearer + `x-organization-id`)
- Data fetching: TanStack Query with `queryKey` including `organizationId`
- Forms: React Hook Form + Zod resolvers
- UI authorization: `<Can permission={Permission.XXX}>` or `useAuthStore.hasPermission()`
- Pages go in `apps/web/src/app/dashboard/[feature]/page.tsx`
- Never expose `NEXT_PUBLIC_` for server-only secrets

## Patterns

- New module: entity → DTOs → service → controller → module → register in AppModule
- New permission: add to `Permission` enum in `packages/shared/src/enums.ts`, grant in `ROLE_PERMISSIONS`, protect route with `@Permissions(...)`
- New frontend page: fetch with TanStack Query, form with RHF+Zod, gate with `<Can>`
- All responses follow `{ success, message, data, meta }` envelope

## Do Not

- Trust client-supplied IDs without scoping by `organizationId`
- Create new global guards/interceptors unless necessary
- Change Sentry config filenames
- Add `NEXT_PUBLIC_` to server-only env vars
- Skip migrations when changing the database schema