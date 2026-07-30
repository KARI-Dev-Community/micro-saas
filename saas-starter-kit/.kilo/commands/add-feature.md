---
name: add-feature
description: Add a new feature module with entity, service, controller, DTOs, permissions, and frontend page
---

# Add Feature Module

Add a new module called `[Feature]` to the SaaS starter kit.

## Steps

1. Create entity in `apps/api/src/[feature]/entities/[feature].entity.ts`
2. Create DTOs in `apps/api/src/[feature]/dto/`
3. Create service in `apps/api/src/[feature]/services/[feature].service.ts`
4. Create controller in `apps/api/src/[feature]/controllers/[feature].controller.ts`
5. Create module in `apps/api/src/[feature]/[feature].module.ts`
6. Register module in `apps/api/src/app.module.ts`
7. Add permissions to `packages/shared/src/enums.ts`
8. Grant permissions in `ROLE_PERMISSIONS`
9. Create frontend page at `apps/web/src/app/dashboard/[feature]/page.tsx`
10. Run migration and migrate database

## Rules

- All entities must have `organizationId` + `@Index()`
- Use `@Permissions(...)` on protected routes
- Use `@CurrentOrganization()` and `@AuthUser()` param decorators
- Return `ok(data)` or `fail(message)` from `@shared/response`
- Frontend uses `api.get/post/patch/del` from `lib/api-client.ts`
- Gate UI with `<Can permission="...">`