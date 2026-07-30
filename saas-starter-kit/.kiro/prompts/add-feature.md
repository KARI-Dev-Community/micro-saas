# Kiro Prompt: Add a New Feature Module

Add a new module called `[Feature]` to the SaaS starter kit.

## Requirements

- Entity `[Entity]` with columns: `id` (uuid PK), `organizationId` (uuid, indexed), `[fields]`, `createdAt`, `updatedAt`
- Service with CRUD methods scoped by `organizationId`
- Controller with routes: `GET /[feature]`, `GET /[feature]/:id`, `POST /[feature]`, `PATCH /[feature]/:id`, `DELETE /[feature]/:id`
- DTOs for create/update with `class-validator` decorators
- Permission enum values: `[feature].read`, `[feature].create`, `[feature].update`, `[feature].delete`
- Frontend page at `/dashboard/[feature]` with list and create form

## Reference Files

- `apps/api/src/project/` — existing backend module pattern
- `apps/web/src/app/dashboard/projects/` — existing frontend page pattern
- `packages/shared/src/enums.ts` — Permission enum
- `packages/shared/src/response.ts` — ok()/fail() helpers

## Rules

- All entities must have `organizationId` + index
- Use `@Permissions(...)` on protected routes
- Use `@CurrentOrganization()` and `@AuthUser()` param decorators
- Return `ok(data)` or `fail(message)` from `@shared/response`
- Frontend uses `api.get/post/patch/del` from `lib/api-client.ts`
- Gate UI with `<Can permission="...">`