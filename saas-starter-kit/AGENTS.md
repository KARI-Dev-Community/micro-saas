# AGENTS.md

Instructions for AI coding agents working in this repository. Read this before making changes.

## What this is

A production-ready, reusable **multi-tenant SaaS starter kit** built with **NestJS (backend)** and **Next.js (frontend)**. Reusable across CRM, ERP, project management, AI SaaS, marketplaces, subscription platforms, internal tools, and enterprise applications.

If a real product has been built on top of this, **update the "What this is" section above with what it actually does** — don't leave this generic.

## Stack

**Backend** — NestJS · TypeORM · PostgreSQL/MySQL · Redis · BullMQ · Swagger · JWT (access + refresh) · Passport
**Frontend** — Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · React Hook Form · Zod · TanStack Query · Zustand
**Infra** — Docker · Docker Compose · Nginx · PM2 · GitHub Actions CI/CD

## Commands

```bash
npm install        # install deps
npm run dev:api    # dev server, localhost:3001
npm run dev:web    # dev server, localhost:3000
npm run build      # production build
npm run lint       # lint
npm run typecheck  # typecheck
npm run migrate    # run TypeORM migrations (workspace apps/api)
npm run docker:up # start infra (postgres + redis)
```

No test suite exists yet. If you add one, use Vitest for unit tests and Playwright for webhook/e2e flows — update this file with the run command once you do.

## Directory map

```
saas-starter-kit/
├── apps/
│   ├── api/                      # NestJS backend
│   │   └── src/
│   │       ├── core/             # redis, queue, guards, response, exception, health, logging
│   │       ├── auth/             # register/login/logout, 2FA, passkeys, sessions, google
│   │       ├── tenant/           # orgs, workspaces, teams, memberships, RBAC, seeder
│   │       ├── billing/          # subscriptions, invoices, coupons
│   │       ├── user/             # profile, preferences, notification settings, deactivate/delete
│   │       ├── notification/     # in-app + realtime notifications
│   │       ├── file/             # uploads, presigned URLs, versioning, public/private
│   │       ├── search/           # global search (FTS), filters, pagination, sorting
│   │       ├── ai/               # OpenAI chat, prompts, history, usage/cost tracking
│   │       ├── project/          # projects, tasks, comments, activity timeline
│   │       ├── admin/            # platform admin, feature flags, system settings
│   │       ├── dashboard/        # KPIs, revenue, user analytics
│   │       ├── email/            # transactional email service (queue-backed)
│   │       ├── workers/          # BullMQ consumers: email, notification, report, cleanup, ai
│   │       └── database/migrations/  # TypeORM migrations
│   └── web/                      # Next.js frontend
│       └── src/
│           ├── app/              # routes (login, register, dashboard/*)
│           ├── components/       # auth forms, providers, ui/ (shadcn-style)
│           └── lib/              # api-client, auth-store (Zustand), rbac, utils
├── packages/
│   └── shared/                   # shared contracts: ApiResponse, enums, ROLE_PERMISSIONS
├── nginx/                        # reverse proxy config
├── .github/workflows/ci.yml      # CI/CD
├── docker-compose.yml
├── Dockerfile.api / Dockerfile.web
├── ecosystem.config.js           # PM2
└── docs/                         # ERD, RBAC, API spec, auth flow, patterns, deployment
```

## Architecture rules — read before touching auth, billing, or data access

**Multi-tenant by default.** Every tenant-scoped entity carries `organizationId`. The `x-organization-id` header selects the active tenant. There is no global/shared data path.
- **Tenant hierarchy**: Organization → Workspace → Team. Memberships link Users to Organizations (and optionally Workspaces/Teams) with a Role.
- **Data isolation**: All service methods scope queries by `organizationId`. The `PermissionGuard` enforces `x-organization-id` on protected routes.

**Auth is JWT-based, not session-based.** `AuthService` issues access + refresh tokens (HS256, `JWT_SECRET`). Access tokens are short-lived (15m), refresh tokens are long-lived (30d) and stored in both `sessions` table and Redis for revocation.
- `apps/api/src/auth/` — auth logic, tokens, 2FA, passkeys, Google OAuth
- `apps/api/src/tenant/` — orgs, workspaces, teams, memberships, RBAC
- `apps/api/src/core/guards/` — `JwtAuthGuard` validates Bearer token; `PermissionGuard` enforces RBAC
- Frontend stores tokens in Zustand (persisted to localStorage) via `apps/web/src/lib/auth-store.ts`
- Frontend API client is `apps/web/src/lib/api-client.ts` — auto-attaches Bearer, sends `x-organization-id`, auto-refreshes on 401

**RBAC is enum-driven and seeded on boot.**
- `packages/shared/src/enums.ts` defines `Permission`, `RoleName`, and `ROLE_PERMISSIONS`
- `RbacSeeder` seeds system roles + permissions on app startup (`apps/api/src/main.ts`)
- Backend: `@Permissions(...)` decorator + `PermissionGuard` per route
- Frontend: `<Can permission="...">` component and `useAuthStore.hasPermission()`
- `super_admin` bypasses all guards

**Standard API envelope.** Every response is wrapped in `{ success, message, data, meta }`.
- Backend: `ok(data, message, meta)` and `fail(message, data)` from `@shared/response`
- `ResponseInterceptor` auto-wraps controller returns
- `AllExceptionsFilter` wraps errors in the same envelope
- Frontend `api-client.ts` `unwrap()` extracts `data` or throws `ApiError`

**Rate limiting and email silently no-op if unconfigured.** `lib/rate-limit.ts` and `lib/email.ts` both check for their respective env vars and skip (not error) if unset. This is intentional for local dev.

**Stripe webhook needs the raw request body** for signature verification (`request.text()`, not `request.json()`). Don't add body-parsing middleware in front of webhook routes.

**Billplz signature verification is order/case sensitive** — see the comment in `lib/billplz.ts` if present. Field names arrive with bracket notation (`billplz[id]`) and must be passed through exactly as received.

**`/dashboard` and `/admin` are gated differently.** `middleware.ts` checks the `session` cookie and redirects both for unauthenticated users, but `/admin` has a second gate — an email allowlist (`ADMIN_EMAILS`) checked in `app/admin/layout.tsx`, not in middleware.

## Database schema

PostgreSQL-flavored with UUID primary keys. See `apps/api/src/database/migrations/0000000000001-initial-schema.ts` for the full schema. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Global user accounts (email, password, 2FA, status) |
| `user_profiles` | Per-user profile (name, avatar, preferences, notifications) |
| `sessions` | Refresh token sessions (auditable, revocable) |
| `passkeys` | WebAuthn credentials |
| `organizations` | Top-level tenants |
| `workspaces` | Org-level groupings |
| `teams` | Workspace-level groupings |
| `memberships` | User ↔ Org/Workspace/Team links with role + status |
| `roles` | RBAC roles (system + custom per-org) |
| `permissions` | Individual permissions (`resource.action`) |
| `role_permissions` | N:N join |
| `subscriptions` | Billing plans per org |
| `invoices` | Billing records |
| `coupons` | Discount codes |
| `projects` | Example tenant-scoped feature |
| `tasks` | Project tasks |
| `task_comments` | Task comments |
| `activities` | Activity timeline |
| `ai_conversations` | AI chat sessions |
| `ai_messages` | AI chat messages |
| `ai_usage` | AI token/cost tracking |
| `ai_prompts` | Saved AI prompts |
| `files` | File uploads (public/private, versioned) |
| `search_documents` | Full-text search index (GIN) |
| `notifications` | In-app + email notifications |
| `audit_logs` | Audit trail |
| `feature_flags` | Feature flags |
| `system_settings` | Key-value system settings |

No migration tool is wired up beyond `typeorm migration:generate`. Add new tables/columns in migrations and update the entity files.

## Security

- Never expose `JWT_SECRET`, `STRIPE_SECRET_KEY`, `BILLPLZ_API_KEY`, `BILLPLZ_X_SIGNATURE_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` to client code — they're server-only by convention (no `NEXT_PUBLIC_` prefix).
- `apps/api/src/auth/` and `apps/api/src/tenant/` are the only data-access paths. All queries run with app DB credentials.
- Enforce access control in app code: only ever query scoped to `organizationId` + authenticated `userId`; don't trust client-supplied ids.
- Passwords hashed with `bcryptjs` (cost 10).
- See `.env.example` for the full list of required/optional env vars.

## Extending to multi-tenant

Already built. If you need to add a new tenant-scoped feature:
1. Entity has `organizationId` column + index.
2. Service methods take `organizationId` and scope all queries.
3. Controller applies `@Permissions(...)` (PermissionGuard requires `x-organization-id`).
4. Frontend sends `organizationId` via `api` helper and gates UI with `<Can>`.

## Don't

- Don't commit `.env.local` or real API keys anywhere in the repo.
- Don't add a new global data-access module — `apps/api/src/auth/` (users/sessions) and `apps/api/src/tenant/` (orgs/memberships) plus feature modules cover every case.
- Don't change `sentry.server.config.ts` / `sentry.edge.config.ts` / `instrumentation-client.ts` filenames if present — Sentry's Next.js SDK expects these exact names at the project root.
- Don't assume `npm run build` succeeding means Stripe/Billplz webhooks work — those need a real signing secret and a tool like the Stripe CLI or a manual Billplz sandbox test to verify.
