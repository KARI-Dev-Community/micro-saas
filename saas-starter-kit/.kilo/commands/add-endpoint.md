---
name: add-endpoint
description: Add a new API endpoint to an existing module
---

# Add API Endpoint

Add a new API endpoint to an existing module in the SaaS starter kit.

## Steps

1. Identify the target controller in `apps/api/src/[module]/controllers/`
2. Add the new method with `@Permissions(...)` decorator
3. Use `@CurrentOrganization()` and `@AuthUser()` for context
4. Return `ok(data)` or `fail(message)` from `@shared/response`
5. Add any needed DTOs in `apps/api/src/[module]/dto/`
6. Update `docs/API.md` if it exists

## Rules

- Never use `@UseGuards(JwtAuthGuard)` — it is global
- All responses follow `{ success, message, data, meta }` envelope
- Tenant-scoped endpoints require `x-organization-id` header