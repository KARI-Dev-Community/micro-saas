# Kiro Prompt: Fix a Bug

Bug: [description]

## Context

- The app uses NestJS with global `JwtAuthGuard` + `PermissionGuard` in `AppModule`
- Public routes need `@Public()` decorator from `core/guards/jwt-auth.guard`
- Protected routes need `@Permissions(...)` from `core/guards/permission.guard`
- Never use `@UseGuards(JwtAuthGuard)` — it's redundant
- All API responses use `{ success, message, data, meta }` envelope
- Frontend `api-client.ts` auto-attaches Bearer token and `x-organization-id`
- Multi-tenant: every entity has `organizationId`, scope all queries by it