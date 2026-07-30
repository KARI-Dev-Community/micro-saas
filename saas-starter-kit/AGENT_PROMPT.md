# SaaS Starter Kit — Agent Prompt

Copy and paste this prompt into your AI coding assistant to configure and extend the SaaS starter kit for your specific needs.

---

## "Set up the SaaS boilerplate for my project"

> Configure the SaaS Starter Kit for a new project called `[ProjectName]`.
> 
> Steps:
> 1. Copy `.env.example` to `.env` and fill in all required variables:
>    - `JWT_SECRET` — generate a strong random string (use `openssl rand -base64 32`)
>    - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` — set to your PostgreSQL instance
>    - `FRONTEND_URL` — set to your frontend origin (e.g. `http://localhost:3000`)
>    - `REDIS_HOST`, `REDIS_PORT` — set to your Redis instance
>    - `EMAIL_PROVIDER` — set to `console` for dev, or configure SMTP/Resend/SES for production
>    - `EMAIL_FROM` — set a valid sender address
>    - `STORAGE_PROVIDER` — set to `local` for dev, or `aws` for production
>    - `OPENAI_API_KEY` — set if AI features are needed
>    - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` — set if billing is needed
>    - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — set if Google OAuth is needed
> 2. Start infrastructure: `npm run docker:up` (or use your own Postgres/Redis)
> 3. Install dependencies: `npm install`
> 4. Run migrations: `npm run migrate`
> 5. Start the app: `npm run dev:api` and `npm run dev:web`
> 6. Verify: API at http://localhost:3001/docs, Web at http://localhost:3000
> 
> Rules:
> - All entities must have `organizationId` + `@Index()`
> - Use `@Permissions(...)` on protected routes
> - Use `@CurrentOrganization()` and `@AuthUser()` param decorators
> - Return `ok(data)` or `fail(message)` from `@shared/response`
> - Frontend uses `api.get/post/patch/del` from `lib/api-client.ts`
> - Gate UI with `<Can permission="...">`
> - Never use `@UseGuards(JwtAuthGuard)` — it's global
> - Never add `NEXT_PUBLIC_` prefix to server-only env vars
> - All tenant-scoped queries must filter by `organizationId`

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

## "Make the SaaS production-ready"

> Configure the SaaS Starter Kit for production deployment.
> 
> Steps:
> 1. Set `NODE_ENV=production` in `.env`
> 2. Set `DB_SYNCHRONIZE=false` (migrations only)
> 3. Set `STORAGE_PROVIDER=aws` and configure S3 credentials for file storage
> 4. Set `EMAIL_PROVIDER` to a real provider (SMTP/Resend/SES), not `console`
> 5. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` for billing
> 6. Set `REDIS_PASSWORD` for Redis authentication
> 7. Configure `STRIPE_WEBHOOK_SECRET` and verify webhook signature in the billing controller
> 8. Set up Nginx with HTTPS (Certbot/Let's Encrypt) and redirect HTTP to HTTPS
> 9. Configure `FRONTEND_URL` to the production domain
> 10. Set `JWT_SECRET` to a strong random value (different per environment)
> 11. Set `DB_*` credentials to production database values
> 12. Run `npm run build --workspaces` and `npm run migrate --workspace apps/api`
> 13. Deploy with `docker compose up -d` or PM2
> 
> Hardening:
> - PostgreSQL with TLS and least-privilege DB user
> - Redis with `requirepass` on a private network
> - Rate limits tuned per route if needed
> - Sentry/OTel for error + request logging in production
> - Backups for Postgres (`pg_dump` / managed snapshots)
> - Real Stripe webhooks (`STRIPE_WEBHOOK_SECRET`) to sync subscription status

---

## "Build a complete SaaS product with this boilerplate"

> I want to use this SaaS Starter Kit to build a `[ProductType]` SaaS product called `[ProductName]`.
> 
> Product description: [Describe what the product does, who the target users are, and what features it needs.]
> 
> Please configure and extend the boilerplate to build this product. Follow these steps:
> 
> 1. **Set up the project** — configure `.env`, run migrations, start the app
> 2. **Define the domain entities** — based on the product description, identify the entities needed (e.g. `Client`, `Project`, `Invoice`, `Task`, etc.)
>    - Each entity must have `organizationId` + `@Index()`
>    - Add appropriate columns, relations, and status enums
> 3. **Create backend modules** — for each entity, create:
>    - Entity file in `apps/api/src/[feature]/entities/`
>    - DTOs in `apps/api/src/[feature]/dto/`
>    - Service with CRUD scoped by `organizationId`
>    - Controller with `@Permissions(...)` routes
>    - Module registration in `AppModule`
> 4. **Add permissions** — add to `Permission` enum and `ROLE_PERMISSIONS`
> 5. **Create frontend pages** — at `apps/web/src/app/dashboard/[feature]/page.tsx`
>    - Use TanStack Query for data fetching
>    - Use React Hook Form + Zod for forms
>    - Gate with `<Can permission={...}>`
> 6. **Configure billing** — set up Stripe keys, plans, and webhooks
> 7. **Configure email** — set up email provider and templates
> 8. **Deploy** — configure for production with Docker Compose or PM2
> 
> Follow all patterns in `AGENTS.md` and `docs/AI_PROMPTS.md`.
> 
> Rules:
> - All entities must have `organizationId` + index
> - Use `@Permissions(...)` on protected routes
> - Use `@CurrentOrganization()` and `@AuthUser()` param decorators
> - Return `ok(data)` or `fail(message)` from `@shared/response`
> - Frontend uses `api.get/post/patch/del` from `lib/api-client.ts`
> - Gate UI with `<Can permission="...">`
> - Never use `@UseGuards(JwtAuthGuard)` — it's global
> - Never add `NEXT_PUBLIC_` prefix to server-only env vars
> - All tenant-scoped queries must filter by `organizationId`