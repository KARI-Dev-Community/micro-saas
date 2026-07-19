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

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose up -d               # api + web + nginx + postgres + redis
# app available on http://localhost (nginx)
```

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
