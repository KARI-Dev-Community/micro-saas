# SaaS Starter Kit

A production-ready, reusable multi-tenant SaaS boilerplate built with **NestJS (backend)** and **Next.js (frontend)**. Designed for CRM, ERP, project management, AI SaaS, marketplaces, subscription platforms, internal tools, and enterprise applications.

## Tech Stack

**Backend** — NestJS · TypeORM · PostgreSQL/MySQL · Redis · BullMQ · Swagger · JWT (access + refresh) · Passport
**Frontend** — Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · React Hook Form · Zod · TanStack Query · Zustand
**Infra** — Docker · Docker Compose · Nginx · PM2 · GitHub Actions CI/CD

## System Architecture

```
Internet ──▶ Nginx (80) ──▶ /  → web (Next.js :3000)
                     └────▶ /api, /docs, /health → api (NestJS :3001)
                                          │
                              ┌───────────┼───────────┐
                            Postgres     Redis       (BullMQ workers in same api process)
```

Nginx terminates requests and routes `/api` to the NestJS API. The API process also hosts the BullMQ workers (queues + consumers in one deployment for simplicity; split into a dedicated worker service at scale).

## Authentication & Security

- **JWT-based auth** — short-lived access tokens (15m) and refresh tokens (30d) stored in `sessions` table + Redis for revocation.
- **2FA (TOTP)** — optional Time-based One-Time Password.
- **WebAuthn passkeys** — passwordless login support.
- **Google OAuth** — social login with upsert.
- **Rate limiting** — global 120 requests per 60 seconds via `@nestjs/throttler`.
- **CORS** — `credentials: true` with configurable `FRONTEND_URL`.

## Multi-Tenancy

Data isolation is enforced at the database and service layers:

1. **Organization** — top-level tenant. Every tenant-scoped row carries `organizationId`.
2. **Workspace** — belongs to an organization; groups projects/data.
3. **Team** — belongs to a workspace; groups members with shared access.
4. **Membership** — links `User ↔ Organization` (and optionally `Workspace`/`Team`) with a `role` and `status` (invited/active/suspended).

- Every query is scoped by `organizationId` in the service layer.
- The `x-organization-id` header is required by `PermissionGuard` for any protected, scoped route.
- The client stores the selected org id (`activeOrgId`) and sends it via the `x-organization-id` header.

## RBAC Permission Matrix

Roles are resolved at runtime from `membership.role` → `role.permissions`. `super_admin` bypasses all guards.

| Permission | super_admin | org_owner | admin | manager | member | viewer |
|-----------|:--:|:--:|:--:|:--:|:--:|:--:|
| platform.read | ✅ | | | | | |
| platform.manage | ✅ | | | | | |
| platform.users.manage | ✅ | | | | | |
| platform.orgs.manage | ✅ | | | | | |
| platform.billing.manage | ✅ | | | | | |
| platform.feature_flags | ✅ | | | | | |
| org.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| org.update | ✅ | ✅ | ✅ | | | |
| org.delete | ✅ | ✅ | | | | |
| org.members.invite | ✅ | ✅ | ✅ | ✅ | | |
| org.members.remove | ✅ | ✅ | ✅ | | | |
| org.members.role | ✅ | ✅ | ✅ | | | |
| org.billing.read | ✅ | ✅ | ✅ | | | |
| org.billing.manage | ✅ | ✅ | ✅ | | | |
| org.settings.manage | ✅ | ✅ | ✅ | | | |
| user.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| user.update | ✅ | ✅ | ✅ | ✅ | ✅ | |
| user.delete | ✅ | ✅ | | | | |
| project.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| project.create | ✅ | ✅ | ✅ | ✅ | ✅ | |
| project.update | ✅ | ✅ | ✅ | ✅ | ✅ | |
| project.delete | ✅ | ✅ | ✅ | ✅ | | |
| project.task.* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅(read) |
| ai.chat | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ai.assistant | ✅ | ✅ | ✅ | ✅ | ✅ | |
| ai.prompt.manage | ✅ | ✅ | ✅ | | | |
| ai.usage.read | ✅ | ✅ | ✅ | | | |
| file.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| file.upload | ✅ | ✅ | ✅ | ✅ | ✅ | |
| file.delete | ✅ | ✅ | ✅ | | | |
| audit.read | ✅ | ✅ | ✅ | | | |
| notification.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| notification.manage | ✅ | ✅ | ✅ | | | |
| dashboard.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| analytics.revenue.read | ✅ | ✅ | ✅ | | | |
| analytics.user.read | ✅ | ✅ | ✅ | ✅ | | |

## Database Schema

The schema is defined in a single TypeORM migration (`InitialSchema0000000000001`) targeting **PostgreSQL** with **22 tables** and explicit foreign keys and indexes.

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` / `user_profiles` | Global user accounts + profile data |
| `organizations` | Top-level tenants |
| `workspaces` / `teams` | Org/team groupings |
| `memberships` / `roles` / `permissions` / `role_permissions` | RBAC core |
| `projects` / `tasks` / `task_comments` / `activities` | Project domain |
| `ai_conversations` / `ai_messages` / `ai_usage` / `ai_prompts` | AI chat + tracking |
| `subscriptions` / `invoices` / `coupons` | Billing |
| `files` | Uploads with versioning |
| `notifications` | In-app + realtime |
| `search_documents` | PostgreSQL GIN-backed full-text search |
| `audit_logs` | Audit trail |
| `feature_flags` / `system_settings` | Platform config |

See `docs/ERD.md` for the full Mermaid ERD and relationship details.

## API Specification

Base URL: `/api` (proxied by Nginx to `:3001`). Auth: `Authorization: Bearer <accessToken>`. Tenant-scoped routes also require `x-organization-id: <orgId>`.

All responses use the standard envelope:

```json
{ "success": true, "message": "Success", "data": {}, "meta": { "page": 1, "limit": 20, "total": 0 } }
```

### Auth (`/auth`)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | /auth/register | – | {email, password, firstName?, lastName?} | Register (sends verify email) |
| POST | /auth/login | – | {email, password, device?} | Login (returns access+refresh; 2FA challenge if enabled) |
| POST | /auth/refresh | – | {refreshToken} | Rotate tokens |
| POST | /auth/logout | ✅ | {refreshToken} | Revoke current session |
| POST | /auth/logout-all | ✅ | – | Revoke all sessions |
| GET | /auth/verify-email?token= | – | – | Verify email |
| POST | /auth/forgot-password | – | {email} | Send reset link |
| POST | /auth/reset-password | – | {token, password} | Reset password |
| POST | /auth/change-password | ✅ | {current, next} | Change password |
| GET | /auth/me | ✅ | – | Current user + permissions |
| GET | /auth/google/login | – | – | Google OAuth start |
| GET | /auth/google/callback | – | code | Google OAuth callback |
| POST | /auth/security/2fa/enable | ✅ | – | Start TOTP (returns secret+otpauth) |
| POST | /auth/security/2fa/confirm | ✅ | {code} | Confirm TOTP |
| POST | /auth/security/2fa/disable | ✅ | – | Disable 2FA |
| GET | /auth/security/sessions | ✅ | – | List active sessions |
| DELETE | /auth/security/sessions/:id | ✅ | – | Revoke a session |
| GET/POST/DELETE | /auth/security/passkeys | ✅ | – | Passkey (WebAuthn) CRUD |

### Organizations & RBAC (`/organizations`)
| Method | Path | Permission |
|--------|------|-----------|
| GET | /organizations/mine | authenticated |
| POST | /organizations | authenticated (creates owner membership) |
| GET | /organizations/:id | org.read |
| PATCH | /organizations/:id | org.update |
| GET | /organizations/:id/members | org.read |
| POST | /organizations/:id/members/invite | org.members.invite |
| POST | /organizations/:id/members/:mid/role | org.members.role |
| DELETE | /organizations/:id/members/:mid | org.members.remove |
| GET/POST | /organizations/:id/workspaces | org.read / org.update |
| POST | /organizations/:id/teams | org.update |

### Billing (`/billing`)
| Method | Path | Permission |
|--------|------|-----------|
| GET | /billing/subscription | org.billing.read |
| POST | /billing/subscription/plan | org.billing.manage |
| POST | /billing/subscription/cancel | org.billing.manage |
| GET | /billing/invoices | org.billing.read |
| GET/POST | /billing/coupons | platform.billing.manage |

### Users (`/users`)
| Method | Path | Permission |
|--------|------|-----------|
| GET | /users/me/profile | authenticated |
| PATCH | /users/me/profile | user.update |
| PATCH | /users/me/preferences | user.update |
| PATCH | /users/me/notification-settings | user.update |
| POST | /users/me/avatar | user.update |
| POST | /users/me/deactivate | user.update |
| DELETE | /users/:id | user.delete |

### Projects (`/projects`)
| Method | Path | Permission |
|--------|------|-----------|
| GET | /projects | project.read (paginated) |
| POST | /projects | project.create (free-tier cap enforced) |
| GET | /projects/:id/tasks | project.task.read |
| POST | /projects/:id/tasks | project.task.create |
| POST | /projects/tasks/:taskId/comments | project.task.read |

### AI (`/ai`)
| Method | Path | Permission |
|--------|------|-----------|
| POST | /ai/chat | ai.chat (enqueues BullMQ job, tracks usage/cost) |
| GET | /ai/conversations | ai.chat |
| GET | /ai/usage | ai.usage.read |
| GET/POST | /ai/prompts | ai.prompt.manage |

### Notifications / Search / Dashboard / Admin
- `/notifications` — list, unread-count, mark-read, read-all (`notification.read`)
- `/search/global` — global FTS with filters/pagination (`org.read`)
- `/dashboard/org` `/dashboard/revenue` `/dashboard/users` `/dashboard/ai-spend`
- `/admin/stats` `/admin/users` `/admin/organizations` `/admin/feature-flags`

## Folder Structure

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
└── docs/                         # Generated docs (ERD, RBAC, API, auth flow, patterns, etc.)
```

## Quick Start (local)

```bash
cp .env.example .env                # fill JWT_SECRET, DB_*, REDIS_*
docker compose up -d postgres redis # or use your own
npm install
npm run migrate --workspace apps/api # run TypeORM migrations
npm run dev:api & npm run dev:web
```

- API: http://localhost:3001 (Swagger at `/docs`)
- Web: http://localhost:3000

## Documentation

The following documents were reverse-engineered from the codebase and are maintained under `docs/`:

| Document | File | Purpose |
|----------|------|---------|
| Entity Relationship Diagram | [`docs/ERD.md`](docs/ERD.md) | Mermaid ERD + relationship table |
| RBAC Permission Matrix | [`docs/RBAC.md`](docs/RBAC.md) | 6 roles × 30+ permissions + how it works |
| API Specification | [`docs/API.md`](docs/API.md) | Full endpoint reference (40+ routes) |
| Authentication & Security Flow | [`docs/AUTH_FLOW.md`](docs/AUTH_FLOW.md) | Login, refresh, 2FA, passkeys, social, sessions |
| Multi-Tenant Architecture | [`docs/MULTITENANT.md`](docs/MULTITENANT.md) | org/workspace/team/membership, isolation, switching |
| Reusable Code Patterns | [`docs/PATTERNS.md`](docs/PATTERNS.md) | 8 copy-paste patterns for extending the kit |
| Production Deployment Guide | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Docker, PM2, Nginx, CI/CD, hardening checklist |
| AI Prompt Templates | [`docs/AI_PROMPTS.md`](docs/AI_PROMPTS.md) | Ready-to-use prompts for vibe coding |
| New Module Template | [`docs/MODULE_TEMPLATE.md`](docs/MODULE_TEMPLATE.md) | Copy-paste skeletons for new backend/frontend modules |

## Extending the Kit

### Adding a new permission

1. Add enum value to `Permission` in `packages/shared/src/enums.ts`
2. Add it to the appropriate role arrays in `ROLE_PERMISSIONS`
3. Apply `@Permissions(Permission.[RESOURCE]_[ACTION])` to the controller method
4. In the frontend, gate UI with `<Can permission={Permission.[RESOURCE]_[ACTION]}>`

### Adding a new feature module

See `docs/MODULE_TEMPLATE.md` for the full copy-paste skeleton. The pattern is:
- Entity extends `BaseEntity` with `organizationId` + index
- Service uses `RbacService` + `AuditService`
- Controller uses `@Permissions(...)` + `@CurrentOrganization()` + `@AuthUser()`
- Frontend page uses `api.get/post/patch/del` and `<Can>` components

### Adding a new email template

The email system is in `apps/api/src/email/`. Templates are rendered with Handlebars. Jobs are enqueued via BullMQ using `this.queues.add(QUEUE_NAMES.EMAIL, "send", payload)`. Follow the pattern in the existing email service and consumer.

### Adding a Stripe webhook

- Route: `POST /api/billing/webhooks/stripe`
- Mark it `@Public()` so Stripe can call it without auth
- Use `request.rawBody()` / `request.text()` for signature verification — do NOT add body-parsing middleware before it
- Handle `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`
- Update `Subscription` entity and enqueue `QUEUE_NAMES.EMAIL` for receipts

## Production Deployment

### Option A — Docker Compose (single host)

```bash
cp .env.example .env
# Set: JWT_SECRET (strong), DB_*, REDIS_*, EMAIL_PROVIDER, FRONTEND_URL, NEXT_PUBLIC_API_URL
docker compose up -d
```

This starts postgres, redis, api (runs migrations then boots), web, and nginx. The app is served on `http://<host>`.

### Option B — PM2 (bare metal / VPS)

```bash
npm ci
npm run build --workspaces
npm run migrate --workspace apps/api
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # enable boot-start
```

`ecosystem.config.js` runs `saas-api` (cluster mode) and `saas-web` with memory restarts. Put Nginx in front:

```nginx
server {
  location /api/ { proxy_pass http://127.0.0.1:3001/api/; }
  location /docs { proxy_pass http://127.0.0.1:3001/docs; }
  location / { proxy_pass http://127.0.0.1:3000; }
}
```

### Hardening checklist

- [ ] Strong `JWT_SECRET`; different per environment.
- [ ] PostgreSQL with TLS; least-privilege DB user.
- [ ] Redis with `requirepass` (set `REDIS_PASSWORD`); use a private network.
- [ ] `EMAIL_PROVIDER` wired to a real provider (SMTP/Resend/SES).
- [ ] `STORAGE_PROVIDER=aws` (S3/MinIO) instead of local disk for files.
- [ ] HTTPS via Certbot/`listen 443 ssl` in Nginx.
- [ ] Real Stripe webhooks (`STRIPE_WEBHOOK_SECRET`) to sync subscription status.
- [ ] Rate limits tuned in `@nestjs/throttler` (global) per route if needed.
- [ ] Sentry/OTel for error + request logging in production.
- [ ] Backups for Postgres (`pg_dump` / managed snapshots).

## Super Admin

To create a super‑admin user:

1. Run the following SQL (replace `YOUR_ORG_ID_UUID` with the actual organization UUID):

```sql
INSERT INTO "users" (email, passwordHash, status, provider, "emailVerified", locale, timezone, currency) VALUES ('superadmin@example.com', '$2b$10$PLACEHOLDER', 'ACTIVE', 'EMAIL', true, 'en', 'UTC', 'USD');
INSERT INTO "memberships" (userId, organizationId, role, status) VALUES ((SELECT id FROM "users" WHERE email = 'superadmin@example.com'), 'YOUR_ORG_ID_UUID', 'SUPER_ADMIN', 'ACTIVE');
```

2. Ensure the organization exists and the user is linked with the `SUPER_ADMIN` role (the role automatically grants all permissions).

3. Log in with the credentials (set the password for the user). The `SUPER_ADMIN` role bypasses all RBAC checks.
