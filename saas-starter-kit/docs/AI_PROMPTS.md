# AI Prompt Templates

Copy and paste these prompts into your AI coding assistant to generate production-ready code that matches the starter kit patterns exactly.

---

## "Add a new feature module"

> Add a new module called `[Feature]` to the SaaS starter kit.
> 
> It should have:
> - Entity `[Entity]` with columns: `id` (uuid PK), `organizationId` (uuid, indexed), `[fields]`, `createdAt`, `updatedAt`
> - Service with CRUD methods scoped by `organizationId`
> - Controller with routes: `GET /[feature]`, `GET /[feature]/:id`, `POST /[feature]`, `PATCH /[feature]/:id`, `DELETE /[feature]/:id`
> - DTOs for create/update with `class-validator` decorators
> - Permission enum values: `[feature].read`, `[feature].create`, `[feature].update`, `[feature].delete`
> - Frontend page at `/dashboard/[feature]` with list and create form
> 
> Follow the existing patterns in `apps/api/src/project/` and `apps/web/src/app/dashboard/projects/`.
> 
> Rules:
> - All entities must have `organizationId` + index
> - Use `@Permissions(...)` on protected routes
> - Use `@CurrentOrganization()` and `@AuthUser()` param decorators
> - Return `ok(data)` or `fail(message)` from `@shared/response`
> - Frontend uses `api.get/post/patch/del` from `lib/api-client.ts`
> - Gate UI with `<Can permission="...">`

---

## "Add a new API endpoint to existing module"

> Add endpoint `GET /api/[module]/stats` to `[Module]Controller`.
> 
> It should return aggregated stats for the current organization.
> Use `@Permissions("[resource].read")` and `@CurrentOrganization()`.
> Return `ok({ total, active, ... }, "Stats")`.
> Follow the pattern in `apps/api/src/dashboard/dashboard.controller.ts`.

---

## "Add a new frontend page"

> Add a new page `/dashboard/[feature]` to the SaaS starter kit.
> 
> It should:
> - Fetch data from `/api/[feature]` using `api.get()` from `lib/api-client.ts`
> - Display a list with TanStack Query
> - Have a create form using React Hook Form + Zod
> - Gate the page with `<Can permission={Permission.[FEATURE]_READ}>`
> - Follow the patterns in `apps/web/src/app/dashboard/projects/page.tsx`

---

## "Fix a bug"

> Bug: [description]
> 
> Context:
> - The app uses NestJS with global `JwtAuthGuard` + `PermissionGuard` in `AppModule`
> - Public routes need `@Public()` decorator from `core/guards/jwt-auth.guard`
> - Protected routes need `@Permissions(...)` from `core/guards/permission.guard`
> - Never use `@UseGuards(JwtAuthGuard)` — it's redundant
> - All API responses use `{ success, message, data, meta }` envelope
> - Frontend `api-client.ts` auto-attaches Bearer token and `x-organization-id`
> - Multi-tenant: every entity has `organizationId`, scope all queries by it

---

## "Add a new permission"

> Add a new permission `[resource].[action]` to the SaaS starter kit.
> 
> Steps:
> 1. Add enum value to `Permission` in `packages/shared/src/enums.ts`
> 2. Add it to the appropriate role arrays in `ROLE_PERMISSIONS`
> 3. Apply `@Permissions(Permission.[RESOURCE]_[ACTION])` to the controller method
> 4. In the frontend, gate UI with `<Can permission={Permission.[RESOURCE]_[ACTION]}>`

---

## "Add a new email template"

> Add a new transactional email template to the SaaS starter kit.
> 
> The email system is in `apps/api/src/email/`. Templates are rendered with Handlebars.
> Jobs are enqueued via BullMQ using `this.queues.add(QUEUE_NAMES.EMAIL, "send", payload)`.
> Follow the pattern in the existing email service and consumer.

---

## "Add Stripe webhook"

> Add a Stripe webhook endpoint to the SaaS starter kit.
> 
> Requirements:
> - Route: `POST /api/billing/webhooks/stripe`
> - Mark it `@Public()` so Stripe can call it without auth
> - Use `request.rawBody()` / `request.text()` for signature verification — do NOT add body-parsing middleware before it
> - Handle `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`
> - Update `Subscription` entity and enqueue `QUEUE_NAMES.EMAIL` for receipts
> - Follow patterns in `apps/api/src/billing/billing.controller.ts`
