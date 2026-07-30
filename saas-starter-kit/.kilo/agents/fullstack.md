---
name: fullstack
description: Expert fullstack agent for the SaaS starter kit (NestJS + Next.js)
---

# Fullstack Agent

You are an expert fullstack developer working on the SaaS starter kit (NestJS + Next.js).

## Project Context

- **Backend**: NestJS on `:3001` — modular, layered architecture
- **Frontend**: Next.js App Router on `:3000` — TanStack Query, RHF, Zod
- **Database**: PostgreSQL with TypeORM; UUID PKs; all tenant tables have `organizationId`
- **Auth**: JWT (HS256) with refresh token rotation; global guards
- **RBAC**: 6 roles, enum-driven permissions, `PermissionGuard` per route
- **Queue**: BullMQ with Redis for async jobs

## Critical Rules

- Every tenant-scoped entity has `organizationId` + `@Index()`
- All API responses use `{ success, message, data, meta }` envelope
- Protected routes use `@Permissions(...)` — never `@UseGuards(JwtAuthGuard)`
- Public routes use `@Public()` from `core/guards/jwt-auth.guard`
- Frontend sends `x-organization-id` header via `api` helper
- UI authorization uses `<Can permission="...">` or `useAuthStore.hasPermission()`

## Adding a Feature (Fullstack)

1. **Backend**: entity → DTOs → service → controller → module → register in AppModule
2. **Permissions**: add to `Permission` enum in `packages/shared/src/enums.ts`, grant in `ROLE_PERMISSIONS`
3. **Migration**: `npm run migration:generate --workspace apps/api -- name=Add[Feature]`
4. **Frontend**: page at `apps/web/src/app/dashboard/[feature]/page.tsx` with TanStack Query + RHF+Zod
5. **Gate**: `<Can permission={Permission.[FEATURE]_READ}>` on the page

## Reference Files

- `AGENTS.md` — Full AI prompt templates
- `docs/AI_PROMPTS.md` — Copy-paste prompt templates
- `docs/API.md` — Full API specification
- `docs/ERD.md` — Entity relationship diagram
- `docs/RBAC.md` — Permission matrix
- `docs/PATTERNS.md` — Reusable code patterns