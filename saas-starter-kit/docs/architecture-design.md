# System Architecture & Design Document (SDD)

**Version:** 1.0 (Draft)
**Date Generated:** 2025-07-31
**Source:** `saas-starter-kit` repository (HEAD)
**Author:** Generated via reverse-engineering from codebase

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### 1.1 High-Level Architecture

The system follows a **layered monolith** pattern, split into two deployable applications:

```
┌─────────────────────────────────────────────┐
│                 Nginx (80)                  │
│            Reverse Proxy / TLS              │
└──────────────┬──────────────────┬────────────┘
               │                  │
       ┌───────▼──────┐   ┌─────▼───────┐
       │  Next.js     │   │   NestJS      │
       │  Frontend    │   │   Backend     │
       │  (:3000)     │   │   (:3001)     │
       └──────────────┘   └───────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
              │ PostgreSQL │ │   Redis   │ │  BullMQ   │
              │   (:5432)  │ │   (:6379) │ │  Workers  │
              └───────────┘ └───────────┘ └──────────┘
```

**Source:** `docker-compose.yml`, `apps/api/src/main.ts`, `apps/web/src/app/layout.tsx`

### 1.2 Request Flow

1. **Frontend** (Next.js App Router) calls `apps/web/src/lib/api-client.ts` (`apiFetch`)
2. **API Client** attaches `Authorization: Bearer` + `x-organization-id` headers
3. **Nginx** proxies to NestJS backend on port `3001`
4. **NestJS global pipeline:**
   - `ThrottlerGuard` — rate limit (120 req/min)
   - `JwtAuthGuard` — validate Bearer token (skipped for `@Public()`)
   - `PermissionGuard` — enforce RBAC via `x-organization-id`
   - `ValidationPipe` — sanitize/transform DTOs
   - `ResponseInterceptor` — wrap output in `{ success, message, data, meta }`
   - `RequestLoggingInterceptor` — log method/path/status/latency
   - `AllExceptionsFilter` — catch unhandled errors into standard envelope

**Source:** `apps/api/src/app.module.ts:56-63`, `apps/api/src/core/guards/*`, `apps/api/src/core/response/response.interceptor.ts`, `apps/api/src/core/exception/exception.filter.ts`

---

## 2. COMPONENT / MODULE BREAKDOWN

### 2.1 Backend Modules (NestJS)

| Module | Path | Responsibility |
|--------|------|----------------|
| **AppModule** | `apps/api/src/app.module.ts` | Root module; registers global guards, interceptors, filters; imports all feature modules |
| **AuthModule** | `apps/api/src/auth/auth.module.ts` | Users, sessions, passkeys, JWT issuance, 2FA, Google OAuth |
| **TenantModule** | `apps/api/src/tenant/tenant.module.ts` | Organizations, workspaces, teams, memberships, RBAC seeding |
| **BillingModule** | `apps/api/src/billing/` | Subscriptions, invoices, coupons |
| **UserModule** | `apps/api/src/user/` | Profiles, preferences, notification settings, deactivate/delete |
| **ProjectModule** | `apps/api/src/project/` | Projects, tasks, task_comments, activity timeline |
| **AiModule** | `apps/api/src/ai/` | AI chat, prompts, conversation history, usage/cost tracking |
| **FileModule** | `apps/api/src/file/` | Uploads, presigned URLs, versioning, public/private visibility |
| **SearchModule** | `apps/api/src/search/` | Global full-text search, filters, pagination, sorting |
| **NotificationModule** | `apps/api/src/notification/` | In-app notifications, realtime notifications |
| **EmailModule** | `apps/api/src/email/` | Transactional email service (queue-backed) |
| **AdminModule** | `apps/api/src/admin/` | Platform admin, feature flags, system settings |
| **DashboardModule** | `apps/api/src/dashboard/` | KPIs, revenue, user analytics |
| **AuditModule** | `apps/api/src/audit/` | Audit trail and logging |
| **WorkerModule** | `apps/api/src/workers/` | BullMQ consumers: email, notification, AI, reports, cleanup |
| **Core** | `apps/api/src/core/` | Cross-cutting: Redis, Queue, Guards, Response, Exception, Health, Logging |

### 2.2 Frontend Structure (Next.js App Router)

| Area | Path | Purpose |
|------|------|---------|
| **Root Layout** | `apps/web/src/app/layout.tsx` | HTML shell, Providers wrapper |
| **Providers** | `apps/web/src/components/providers.tsx` | TanStack Query client setup |
| **Auth Pages** | `apps/web/src/app/login/`, `register/`, `forgot-password/`, `reset-password/`, `oauth/` | Authentication flows |
| **Dashboard** | `apps/web/src/app/dashboard/` | Protected workspace pages |
| **Admin** | `apps/web/src/app/admin/` | Platform admin (email allowlist gated in layout) |
| **API Client** | `apps/web/src/lib/api-client.ts` | Centralized fetch with auto-refresh |
| **Auth Store** | `apps/web/src/lib/auth-store.ts` | Zustand persisted state for session, org, permissions |
| **RBAC** | `apps/web/src/lib/rbac.tsx` | `<Can>` component and `useAuthStore.hasPermission()` |

**Source:** `apps/web/src/app/layout.tsx`, `apps/web/src/components/providers.tsx`, `apps/web/src/lib/api-client.ts`, `apps/web/src/lib/auth-store.ts`, `apps/web/src/lib/rbac.tsx`

---

## 3. DATA DESIGN

### 3.1 Schema Summary

The database schema is defined in a single initial migration (`InitialSchema0000000000001`) targeting **PostgreSQL** (UUID primary keys via `uuid-ossp` extension). The schema contains **22 tables** with explicit foreign keys and indexes.

**Source:** `apps/api/src/database/migrations/0000000000001-initial-schema.ts`

| Category | Tables |
|----------|--------|
| **Auth/Users** | `users`, `user_profiles`, `sessions`, `passkeys` |
| **Multi-tenant** | `organizations`, `workspaces`, `teams`, `memberships`, `roles`, `permissions`, `role_permissions` |
| **Billing** | `subscriptions`, `invoices`, `coupons` |
| **Feature Domain** | `projects`, `tasks`, `task_comments`, `activities` |
| **AI** | `ai_conversations`, `ai_messages`, `ai_usage`, `ai_prompts` |
| **Files** | `files` |
| **Search** | `search_documents` (with GIN index for FTS) |
| **Notifications** | `notifications` |
| **Audit** | `audit_logs` |
| **Platform** | `feature_flags`, `system_settings` |

### 3.2 Relationships

- `users` 1<->1 `user_profiles` (CASCADE delete)
- `users` 1<->N `sessions` (CASCADE delete)
- `users` 1<->N `passkeys` (CASCADE delete)
- `organizations` 1<->N `workspaces` (CASCADE delete)
- `workspaces` 1<->N `teams` (CASCADE delete)
- `users` N<->M `organizations` via `memberships`
- `roles` N<->M `permissions` via `role_permissions`
- `organizations` 1<->N `subscriptions` (CASCADE delete)
- `projects` 1<->N `tasks` (CASCADE delete)
- `tasks` 1<->N `task_comments` (CASCADE delete)
- `ai_conversations` 1<->N `ai_messages` (CASCADE delete)

See `docs/database-schema.md` for the full relationship diagram and cardinality table.

### 3.3 Entity-Relationship Summary (Text)

```
users (1) ──── (1) user_profiles
  │
  ├── (1:N) sessions
  ├── (1:N) passkeys
  ├── (N:1) memberships → organizations
  │                 └── (1:N) workspaces
  │                       └── (1:N) teams
  ├── (N:1) ai_conversations
  │         └── (1:N) ai_messages
  ├── (N:1) files (ownerId)
  ├── (N:1) notifications
  ├── (N:1) activities (actorId)
  ├── (N:1) ai_usage (userId)
  ├── (N:1) ai_prompts (createdBy)
  ├── (N:1) projects (ownerId)
  │         └── (1:N) tasks
  │               └── (1:N) task_comments
  └── (N:1) audit_logs (actorId)
```

---

## 4. DESIGN PATTERNS USED

| Pattern | Where | Evidence |
|---------|-------|----------|
| **Layered Architecture** | All modules | Controllers → Services → Repositories (TypeORM) |
| **Dependency Injection** | NestJS modules | `@Injectable()`, constructor injection throughout |
| **Global Cross-cutting Concerns** | `app.module.ts` | `APP_INTERCEPTOR`, `APP_GUARD`, `APP_FILTER` providers |
| **Decorator-based Metadata** | Auth, RBAC | `@Public()`, `@Permissions(...)`, `@UseGuards(PermissionGuard)` |
| **Strategy Pattern** | Auth | `JwtStrategy` (Passport) for token validation |
| **Interceptor Chain** | Core | `ResponseInterceptor`, `RequestLoggingInterceptor` |
| **Exception Filter Pattern** | Core | `AllExceptionsFilter` catches all and formats as `ApiResponse` |
| **Repository Pattern** | TypeORM | `TypeOrmModule.forFeature()` + service-level queries |
| **Factory Pattern** | Config | `registerAs("app")`, `registerAs("database")` for env-config |
| **Singleton State (Frontend)** | Web | Zustand `create()` with `persist` middleware for auth state |

**Source:** `apps/api/src/app.module.ts`, `apps/api/src/core/guards/*`, `apps/api/src/auth/strategies/`, `apps/web/src/lib/auth-store.ts`

---

## 5. THIRD-PARTY INTEGRATIONS

| Integration | Purpose | Configuration Location |
|-------------|---------|------------------------|
| **PostgreSQL** | Primary database | `docker-compose.yml`, `apps/api/src/config/database.config.ts` |
| **Redis** | Cache, session token revocation, BullMQ backend | `apps/api/src/config/app.config.ts`, `docker-compose.yml` |
| **BullMQ** | Async job processing (email, notifications, AI, reports, cleanup) | `apps/api/src/core/queue/` |
| **Passport.js** | JWT strategy, Google OAuth strategy | `apps/api/src/auth/strategies/` |
| **Swagger / OpenAPI** | API documentation | `apps/api/src/main.ts` (`/docs` endpoint) |
| **OpenAI** | AI chat completions | `apps/api/src/config/app.config.ts` (`OPENAI_API_KEY`, `AI_CHAT_MODEL`) |
| **Google OAuth** | Social login | `apps/api/src/config/app.config.ts` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) |
| **Stripe** | Subscription billing, webhooks | `apps/api/src/config/app.config.ts` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) |
| **Email Provider** | Transactional email (SMTP / console / other) | `apps/api/src/config/app.config.ts` (`EMAIL_PROVIDER`, `EMAIL_FROM`) |
| **Storage Provider** | File uploads (local / S3 / etc.) | `apps/api/src/config/app.config.ts` (`STORAGE_PROVIDER`, `STORAGE_LOCAL_DIR`) |
| **Nginx** | Reverse proxy, TLS termination | `nginx/` |

**Source:** `apps/api/src/config/app.config.ts:27-46`, `docker-compose.yml`, `apps/api/src/main.ts:22-30`

---

## 6. SECURITY DESIGN

### 6.1 Authentication Flow

- **JWT-based (not session-based):**
  - Access token: short-lived (default 15m)
  - Refresh token: long-lived (default 30d), stored in `sessions` table + Redis for revocation
- **Token issuance:** `AuthService`
- **Token validation:** `JwtStrategy` (Passport) via `JwtAuthGuard`
- **Token storage:** Frontend stores tokens in `localStorage` key `saas_tokens` via Zustand persist middleware
- **Auto-refresh:** `apps/web/src/lib/api-client.ts:70-81` — on 401, attempts refresh; if refresh fails, clears tokens and throws `ApiError("Session expired", 401)`

**Source:** `apps/api/src/config/app.config.ts:8-10`, `apps/web/src/lib/api-client.ts`, `apps/web/src/lib/auth-store.ts`, `apps/api/src/core/guards/jwt-auth.guard.ts`

### 6.2 Authorization (RBAC)

- **Enum-driven permissions** defined in `packages/shared/src/enums.ts:83-140`
- **5 default roles:** `super_admin`, `org_owner`, `admin`, `manager`, `member`, `viewer`
- **Permission matrix:** `ROLE_PERMISSIONS` map in `packages/shared/src/enums.ts:145-262`
- **Enforcement:** `PermissionGuard` (`apps/api/src/core/guards/permission.guard.ts`)
  - Reads `@Permissions(...)` metadata from route/handler
  - Resolves user permissions for the active `organizationId` via `RbacService`
  - Supports `all` (default) or `any` mode via `@PermissionMode("any")`
- **Super admin bypass:** `role === "super_admin"` skips all permission checks
- **Tenant context:** `x-organization-id` header or JWT `organizationId` claim

**Source:** `packages/shared/src/enums.ts`, `apps/api/src/core/guards/permission.guard.ts`

### 6.3 Data Isolation

- **Multi-tenant by default:** Every tenant-scoped entity carries `organizationId`
- **No global/shared data path** per documented architecture
- **Frontend sends** `x-organization-id` via `apps/web/src/lib/api-client.ts:51`
- **Backend scopes** queries by `organizationId` in service methods

### 6.4 Password & Secrets

- **Hashing:** `bcryptjs` (cost 10) per `AGENTS.md`
- **Server-only secrets:** `JWT_SECRET`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — none prefixed `NEXT_PUBLIC_`
- **Webhook raw body:** Stripe/Billplz webhooks require `request.text()` (not `request.json()`); no body-parsing middleware in front

### 6.5 Rate Limiting

- **Global ThrottlerGuard:** 120 requests per 60 seconds (`apps/api/src/app.module.ts:37`)

### 6.6 CORS

- **Enabled** with `origin: process.env.FRONTEND_URL ?? "*"` and `credentials: true` (`apps/api/src/main.ts:11`)

**Source:** `apps/api/src/app.module.ts:36-37`, `apps/api/src/main.ts:11`, `AGENTS.md`

---

## 7. ERROR HANDLING STRATEGY

### 7.1 Standard API Envelope

Every response, including errors, is wrapped in:
```json
{
  "success": boolean,
  "message": string,
  "data": object | null,
  "meta": object | null
}
```

**Success wrapping:** `ResponseInterceptor` (`apps/api/src/core/response/response.interceptor.ts:14-29`) — if controller return already contains `success` and `message`, it passes through; otherwise wraps in `{ success: true, message: "Success", data: payload, meta: null }`

**Error wrapping:** `AllExceptionsFilter` (`apps/api/src/core/exception/exception.filter.ts:20-57`) — catches all exceptions:
- `HttpException` → extracts `statusCode`, `message`, and optional `code`
- Generic `Error` → uses `message`, status 500
- 500+ errors logged via `Logger` with method, URL, status, latency

**Business domain errors:** `BusinessException` extends `HttpException` with an optional `code` field (e.g., `LIMIT_REACHED`, `EMAIL_TAKEN`), surfaced as `data: { code }` in the failing response.

**Frontend unwrap:** `apps/web/src/lib/api-client.ts:106-114` (`unwrap()` function) extracts `data` or throws `ApiError` with message, status, and optional code.

**Source:** `packages/shared/src/response.ts`, `apps/api/src/core/response/response.interceptor.ts`, `apps/api/src/core/exception/exception.filter.ts`, `apps/web/src/lib/api-client.ts`

---

## 8. CONFIGURATION & ENVIRONMENT

**Source:** `apps/api/src/config/app.config.ts`, `docker-compose.yml`

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | API port |
| `API_PREFIX` | `api` | Global route prefix |
| `NODE_ENV` | `development` | Environment |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin |
| `JWT_SECRET` | *(required)* | HS256 signing secret |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh token TTL |
| `DB_TYPE` | `postgres` | PostgreSQL or MySQL |
| `DB_HOST/PORT/USERNAME/PASSWORD/DATABASE` | `localhost:5432/saas/saas/saas` | Database connection |
| `DB_SYNCHRONIZE` | `false` | Auto-sync schema (disabled in prod) |
| `REDIS_HOST/PORT` | `localhost:6379` | Cache / session store |
| `EMAIL_PROVIDER` | `console` | Email backend (console, SMTP, etc.) |
| `EMAIL_FROM` | `no-reply@saas.dev` | Sender address |
| `OPENAI_API_KEY` | *(required for AI)* | OpenAI key |
| `AI_CHAT_MODEL` | `gpt-4o-mini` | Default model |
| `STRIPE_SECRET_KEY` | *(required for billing)* | Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | *(required for webhooks)* | Stripe webhook signing |
| `STORAGE_PROVIDER` | `local` | File storage backend |
| `STORAGE_LOCAL_DIR` | `./uploads` | Local upload directory |
| `GOOGLE_CLIENT_ID/SECRET` | *(optional)* | Google OAuth |

---

## 9. DEPLOYMENT OVERVIEW

### 9.1 Docker Orchestration

**Source:** `docker-compose.yml`

Services:
1. **postgres** — `postgres:16-alpine`, port `5432`, volume `pgdata`
2. **redis** — `redis:7-alpine`, port `6379`
3. **api** — Built from `Dockerfile.api`, port `3001`, healthcheck, runs migrations then starts NestJS
4. **web** — Built from `Dockerfile.web`, port `3000`, depends on `api`
5. **nginx** — `nginx:1.27-alpine`, port `8080` (mapped to 80), serves as reverse proxy

### 9.2 Build Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies across workspaces |
| `npm run dev:api` | Start NestJS dev server (`localhost:3001`) |
| `npm run dev:web` | Start Next.js dev server (`localhost:3000`) |
| `npm run build` | Production build across workspaces |
| `npm run lint` / `npm run typecheck` | Code quality |
| `npm run migrate` | Run TypeORM migrations |
| `npm run docker:up` | Start PostgreSQL + Redis via Docker |

**Source:** Root `package.json`