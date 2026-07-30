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

---

## "Adapt for a different SaaS domain"

> Adapt this SaaS starter kit for a [domain] product (e.g., LMS, CRM, marketplace, helpdesk).
>
> Steps:
> 1. Identify the core entities for the domain (e.g., Course/Lesson for LMS, Contact/Deal for CRM)
> 2. Rename `project`/`task` modules to domain entities, keeping the same patterns
> 3. Add new permission enum values in `packages/shared/src/enums.ts`
> 4. Grant new permissions in `ROLE_PERMISSIONS` for relevant roles
> 5. Replace dashboard pages under `apps/web/src/app/dashboard/` with domain pages
> 6. Update `docs/ERD.md` to reflect new entity relationships
> 7. Update the `docs/API.md` specification for new endpoints
> 8. Keep `organizationId` on all tenant-scoped entities
> 9. Keep the auth, billing, and admin modules unchanged unless the domain requires it
>
> Rules:
> - Do not remove multi-tenancy — it is core to the architecture
> - Do not remove RBAC — adapt roles/permissions to the domain
> - Follow existing patterns in `apps/api/src/project/` and `apps/web/src/app/dashboard/projects/`

---

## "Add a subscription/plan system"

> Add a subscription plan system to the SaaS starter kit.
>
> It should have:
> - Entity `Plan` with columns: `id` (uuid PK), `organizationId` (uuid, indexed), `name`, `priceCents`, `interval` (`monthly`|`yearly`), `features` (jsonb), `isActive`, `createdAt`, `updatedAt`
> - Entity `Subscription` with columns: `id`, `organizationId`, `planId`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `canceledAt`, `cancelAtPeriodEnd`
> - Service methods: `listPlans`, `subscribe`, `cancelSubscription`, `changePlan`
> - Controller routes: `GET /billing/plans`, `POST /billing/subscription`, `PATCH /billing/subscription`, `DELETE /billing/subscription`
> - Permission enum values: `billing.read`, `billing.manage`
> - Frontend billing page at `/dashboard/billing` with plan selection and subscription management
>
> Follow the existing patterns in `apps/api/src/billing/` and `apps/web/src/app/dashboard/`.

---

## "Add a notification system"

> Add an in-app notification system to the SaaS starter kit.
>
> It should have:
> - Entity `Notification` with columns: `id` (uuid PK), `userId` (uuid, indexed), `organizationId` (uuid, indexed), `channel` (`in_app`|`email`|`realtime`), `status` (`unread`|`read`|`archived`), `title`, `body`, `link`, `category`, `metadata` (jsonb), `createdAt`, `updatedAt`
> - Service methods: `list`, `unreadCount`, `markRead`, `markAllRead`
> - Controller routes: `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`
> - Permission enum values: `notification.read`, `notification.manage`
> - Frontend notification bell component at the dashboard header
> - Real-time updates via BullMQ worker that enqueues notification jobs
>
> Follow the existing patterns in `apps/api/src/notification/` and `apps/web/src/app/`.

---

## "Add file upload with S3 storage"

> Add file upload with S3 storage to the SaaS starter kit.
>
> It should:
> - Configure `STORAGE_PROVIDER=s3` and `STORAGE_S3_BUCKET` in `.env`
> - Use the existing `FileService` in `apps/api/src/file/` with a pluggable storage adapter
> - Add S3 adapter in `apps/api/src/file/storage/s3.storage.ts`
> - Generate presigned URLs for direct browser uploads to S3
> - Keep `organizationId` scoping on all file queries
> - Add permission `file.upload` and `file.delete` to relevant roles
> - Frontend: use `api.post` to get presigned URL, then upload directly to S3
>
> Follow the existing patterns in `apps/api/src/file/` and `apps/api/src/config/app.config.ts`.

---

## "Add a dashboard with charts"

> Add a dashboard page with charts to the SaaS starter kit.
>
> It should:
> - Create a new controller endpoint `GET /dashboard/analytics` that returns aggregated data (revenue, users, activity counts)
> - Use TanStack Query on the frontend to fetch analytics data
> - Use a chart library (Recharts or Chart.js) to render the data
> - Gate the page with `<Can permission={Permission.DASHBOARD_READ}>`
> - Follow the patterns in `apps/api/src/dashboard/dashboard.controller.ts` and `apps/web/src/app/dashboard/`
>
> Rules:
> - Backend returns `ok({ revenue, users, activities }, "Analytics")`
> - Frontend fetches via `api.get("/api/dashboard/analytics")`
> - Charts are client-side rendered from the API response
