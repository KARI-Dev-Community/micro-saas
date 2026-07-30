# SaaS Starter Kit

A production-ready, reusable multi-tenant SaaS starter kit built with **NestJS (backend)** and **Next.js (frontend)**. Reusable across CRM, ERP, project management, AI SaaS, marketplaces, subscription platforms, internal tools, and enterprise applications.

## Tech Stack

**Backend** — NestJS · TypeORM · PostgreSQL/MySQL · Redis · BullMQ · Swagger · JWT (access + refresh) · Passport
**Frontend** — Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · React Hook Form · Zod · TanStack Query · Zustand
**Infra** — Docker · Docker Compose · Nginx · PM2 · GitHub Actions CI/CD

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
└── ecosystem.config.js           # PM2
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

## API Standards

All responses use the standard envelope:

```json
{ "success": true, "message": "Success", "data": {}, "meta": { "page": 1, "limit": 20, "total": 0 } }
```

Every route supports pagination (`?page=&limit=`), sorting (`?sort=field:asc|desc`),
filtering (any column as a query param), validation (class-validator), and a global
exception filter. Swagger documents every endpoint; auth via `Authorization: Bearer <access>`
plus `x-organization-id` for tenant-scoped calls.

See `docs/` for the ERD, RBAC matrix, full API spec, auth flow, multi-tenant architecture, and reusable patterns.

## Documentation (Generated from Codebase)

The following documents were reverse-engineered from the codebase and are maintained under `docs/`:

| Document | File | Purpose |
|----------|------|---------|
| Architecture & Design | [`docs/architecture-design.md`](docs/architecture-design.md) | System architecture, module breakdown, data design, security design, error handling |
| Database Schema / ERD | [`docs/database-schema.md`](docs/database-schema.md) | Full 22-table schema, relationships, indexes, design flags |
| API Specification | [`docs/api-specification.md`](docs/api-specification.md) | OpenAPI-style endpoint reference (40+ routes) |
| Software Requirements | [`docs/requirements.md`](docs/requirements.md) | SRS with functional & non-functional requirements |
| Deployment & Environment | [`docs/deployment.md`](docs/deployment.md) | Docker Compose, PM2, env vars, deployment checklist |

(End of file - total 81 lines)

## Super Admin

To create a super‑admin user:

1. Run the following SQL (replace `YOUR_ORG_ID_UUID` with the actual organization UUID):

```sql
INSERT INTO "users" (email, passwordHash, status, provider, "emailVerified", locale, timezone, currency) VALUES ('superadmin@example.com', '$2b$10$PLACEHOLDER', 'ACTIVE', 'EMAIL', true, 'en', 'UTC', 'USD');
INSERT INTO "memberships" (userId, organizationId, role, status) VALUES ((SELECT id FROM "users" WHERE email = 'superadmin@example.com'), 'YOUR_ORG_ID_UUID', 'SUPER_ADMIN', 'ACTIVE');
```

2. Ensure the organization exists and the user is linked with the `SUPER_ADMIN` role (the role automatically grants all permissions).

3. Log in with the credentials (set the password for the user). The `SUPER_ADMIN` role bypasses all RBAC checks.