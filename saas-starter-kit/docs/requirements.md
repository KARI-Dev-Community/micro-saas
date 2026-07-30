# Software Requirements Specification (SRS)

**Version:** 1.0 (Draft)
**Date Generated:** 2025-07-31
**Source:** `saas-starter-kit` repository — derived from controllers, services, DTOs, entities, enums, and configuration
**Author:** Generated via reverse-engineering from codebase

---

## 1. PURPOSE & SCOPE

### 1.1 Purpose
This document specifies the functional and non-functional requirements of the **SaaS Starter Kit**, a production-ready multi-tenant SaaS boilerplate. It is intended for developers, stakeholders, and auditors. Requirements are derived exclusively from the implemented codebase and may include items flagged as `[ASSUMPTION]` where intent cannot be confirmed from code alone.

### 1.2 Scope
The SaaS Starter Kit provides:
- Multi-tenant organization management (Organization -> Workspace -> Team hierarchy)
- JWT-based authentication with 2FA (TOTP + WebAuthn passkeys) and Google OAuth
- Role-Based Access Control (RBAC) with 6 default roles and 30+ granular permissions
- Project and task management with activity timelines
- AI chat integration with usage/cost tracking and prompt management
- File upload, versioning, and presigned URL access
- Global full-text search
- Billing (subscriptions, invoices, coupons)
- In-app notifications with read/unread/archived states
- Platform admin dashboard, feature flags, and system settings
- Audit logging
- BullMQ-backed email and background worker processing

### 1.3 Out of Scope
- Mobile applications (not present in codebase)
- Native mobile SDKs
- End-to-end encryption for file storage (visibility is public/private via application logic)
- Multi-language/i18n support (locale stored in DB but UI not internationalized) [ASSUMPTION]
- Advanced workflow/automation engines
- Real-time chat signaling beyond simple in-app notifications
- Native database connection pooling configuration beyond defaults
- Third-party identity providers beyond Google OAuth

---

## 2. INTENDED USERS / ACTORS

| Actor | Description | Evident From |
|-------|-------------|--------------|
| **Unauthenticated Visitor** | Can register, log in, reset password, verify email | `@Public()` routes in AuthController, GoogleController, HealthController |
| **Authenticated User** | Has global identity; can manage own profile, security settings, and session | UserController, SecurityController |
| **Member** | Read-only project/org/notification access | RoleName.MEMBER in packages/shared/src/enums.ts:235-250 |
| **Manager** | Broad project and user management | RoleName.MANAGER in packages/shared/src/enums.ts:215-233 |
| **Admin** | Org management, billing read, most features | RoleName.ADMIN in packages/shared/src/enums.ts:184-213 |
| **Organization Owner** | Full org control including billing and deletion | RoleName.ORG_OWNER in packages/shared/src/enums.ts:148-182 |
| **Super Admin** | Platform-wide access; bypasses all guards | RoleName.SUPER_ADMIN in packages/shared/src/enums.ts:146, PermissionGuard |
| **Platform Admin** | System-level management (users, orgs, feature flags) | AdminController permissions: platform.* |
| **System / Workers** | Background email, notification, AI, cleanup jobs | WorkerModule, QueueModule |

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 Authentication & Identity

**FR-AUTH-01 — User Registration**
- The system shall allow unauthenticated users to register an account with email and password.
- Upon registration, the user account is created with status `pending` and a verification email is sent. [ASSUMPTION — email module exists but send logic not visible in controller]
- **Source:** apps/api/src/auth/auth.controller.ts:42-47

**FR-AUTH-02 — Email Verification**
- The system shall provide an endpoint to verify email via token.
- Upon verification, the user is redirected to the frontend login page with query parameter `verified=1`.
- **Source:** apps/api/src/auth/auth.controller.ts:83-88

**FR-AUTH-03 — Login (Email/Password)**
- The system shall authenticate users via email and password.
- If the user has 2FA enabled, the login response shall indicate `twoFactorRequired: true` with the user ID, requiring subsequent 2FA verification.
- **Source:** apps/api/src/auth/auth.controller.ts:49-62

**FR-AUTH-04 — Two-Factor Authentication (TOTP)**
- The system shall allow users to enable TOTP-based 2FA.
- Users shall provide a TOTP code to confirm activation.
- Users shall be able to disable TOTP.
- **Source:** apps/api/src/auth/security.controller.ts:43-60

**FR-AUTH-05 — WebAuthn Passkeys**
- The system shall allow users to register and manage WebAuthn passkeys as an alternative 2FA/sign-in method.
- Users shall be able to list their passkeys and remove individual passkeys.
- **Source:** apps/api/src/auth/security.controller.ts:98-122, migration passkeys table

**FR-AUTH-06 — JWT Token Management**
- The system shall issue short-lived access tokens (default 15m) and long-lived refresh tokens (default 30d).
- Access tokens shall carry the user ID, email, organization ID, and permissions.
- The system shall provide endpoints to refresh access tokens and to revoke refresh tokens (single logout and logout-all).
- **Source:** apps/api/src/auth/auth.controller.ts:64-81, apps/api/src/config/app.config.ts:9-10

**FR-AUTH-07 — Password Reset**
- The system shall allow users to request a password reset via email. [ASSUMPTION: email is sent]
- The system shall allow users to reset their password using a valid reset token.
- **Source:** apps/api/src/auth/auth.controller.ts:90-104

**FR-AUTH-08 — Password Change (Authenticated)**
- Authenticated users shall be able to change their password by providing their current password and a new password.
- **Source:** apps/api/src/auth/auth.controller.ts:106-110

**FR-AUTH-09 — Google OAuth**
- The system shall support Google OAuth2 authorization code flow.
- On successful callback, a user account is created or upserted (provider = google, emailVerified = true, status = active), and tokens are issued.
- The user is redirected to the frontend with tokens in query parameters.
- **Source:** apps/api/src/auth/google.controller.ts:24-55

**FR-AUTH-10 — Session Management**
- Authenticated users shall be able to list their active sessions with device, browser, OS, IP, and location metadata.
- Users shall be able to revoke individual sessions or all other sessions (logout-all).
- **Source:** apps/api/src/auth/security.controller.ts:62-96, migration sessions table

### 3.2 Multi-Tenant Organization Management

**FR-TEN-01 — Organization CRUD**
- Authenticated users shall be able to create organizations.
- Users shall be able to list organizations they belong to.
- Organization owners and admins shall be able to retrieve and update organization details.
- **Source:** apps/api/src/tenant/tenant.controller.ts:46-66

**FR-TEN-02 — Workspace Management**
- Users with org.update permission shall be able to create workspaces within an organization.
- Workspaces shall be listable.
- **Source:** apps/api/src/tenant/tenant.controller.ts:94-104

**FR-TEN-03 — Team Management**
- Users with org.update permission shall be able to create teams within a specific workspace.
- **Source:** apps/api/src/tenant/tenant.controller.ts:106-110

**FR-TEN-04 — Member Invitation**
- Users with org.members.invite permission shall be able to invite new members by email, assigning a role.
- Invited members shall receive an invitation token with expiry. [ASSUMPTION: email is sent]
- **Source:** apps/api/src/tenant/tenant.controller.ts:74-78, migration memberships.invitationToken, invitationExpiresAt

**FR-TEN-05 — Member Role Management**
- Users with org.members.role permission shall be able to change a member's role.
- **Source:** apps/api/src/tenant/tenant.controller.ts:80-85

**FR-TEN-06 — Member Removal**
- Users with org.members.remove permission shall be able to remove a member from the organization.
- **Source:** apps/api/src/tenant/tenant.controller.ts:87-92

### 3.3 Role-Based Access Control (RBAC)

**FR-RBAC-01 — Permission Enforcement**
- Every protected route shall validate the user's permissions against the active organization context (x-organization-id header or JWT claim).
- The system shall enforce all (default) or any permission mode per route.
- **Source:** apps/api/src/core/guards/permission.guard.ts, packages/shared/src/enums.ts

**FR-RBAC-02 — Role Definitions**
- The system shall seed 5 default system roles: super_admin, org_owner, admin, manager, member, viewer.
- Custom roles shall be creatable per organization. [ASSUMPTION: UI/API for custom role creation not visible in current controller scan]
- **Source:** packages/shared/src/enums.ts:64-71, apps/api/src/tenant/rbac.seeder.ts (implied)

**FR-RBAC-03 — Super Admin Bypass**
- Users with super_admin role shall bypass all permission guards.
- **Source:** apps/api/src/core/guards/permission.guard.ts:57

### 3.4 User Profile & Settings

**FR-USER-01 — Profile Management**
- Authenticated users shall be able to view and update their own profile.
- Users shall be able to set an avatar URL.
- **Source:** apps/api/src/user/user.controller.ts:11-34

**FR-USER-02 — Preferences**
- Users shall be able to update arbitrary preference key-value pairs.
- **Source:** apps/api/src/user/user.controller.ts:21-24

**FR-USER-03 — Notification Settings**
- Users shall be able to update notification channel preferences.
- **Source:** apps/api/src/user/user.controller.ts:26-29

**FR-USER-04 — Account Deactivation**
- Users shall be able to deactivate their own account.
- **Source:** apps/api/src/user/user.controller.ts:36-40

**FR-USER-05 — Account Deletion**
- The system shall allow deletion of user accounts (with cascading effects on profiles, sessions, passkeys).
- **Source:** apps/api/src/user/user.controller.ts:42-46

### 3.5 Project & Task Management

**FR-PROJ-01 — Project CRUD**
- Users with project.read shall be able to list projects.
- Users with project.create shall be able to create projects with name, description, and optional workspace association.
- **Source:** apps/api/src/project/project.controller.ts:31-41

**FR-PROJ-02 — Task CRUD**
- Users with project.task.read shall be able to list tasks for a project.
- Users with project.task.create shall be able to create tasks with title, description, status, priority, assignee, and due date.
- **Source:** apps/api/src/project/project.controller.ts:43-53

**FR-PROJ-03 — Task Comments**
- Users with project.task.read shall be able to add comments to tasks.
- **Source:** apps/api/src/project/project.controller.ts:55-59

**FR-PROJ-04 — Activity Timeline**
- Users with project.read shall be able to retrieve an activity timeline for the organization.
- **Source:** apps/api/src/project/project.controller.ts:67-71

### 3.6 AI Features

**FR-AI-01 — AI Chat**
- Users with ai.chat permission shall be able to send chat prompts to an AI model and receive responses.
- Chats can be linked to an existing conversation or start a new one.
- An optional system prompt can be provided.
- **Source:** apps/api/src/ai/ai.controller.ts:20-24

**FR-AI-02 — Conversation History**
- Users shall be able to list their own AI conversations.
- **Source:** apps/api/src/ai/ai.controller.ts:26-30

**FR-AI-03 — Usage Reporting**
- Users with ai.usage.read shall be able to view AI token usage and cost reports for the organization.
- **Source:** apps/api/src/ai/ai.controller.ts:32-36

**FR-AI-04 — Prompt Management**
- Users with ai.prompt.manage shall be able to list and create AI prompts for the organization.
- **Source:** apps/api/src/ai/ai.controller.ts:38-48

### 3.7 File Management

**FR-FILE-01 — File Upload**
- Users with file.upload shall be able to upload files (base64 input) with metadata: fileName, mimeType, sizeBytes, and visibility (public or private).
- **Source:** apps/api/src/file/file.controller.ts:23-41

**FR-FILE-02 — File Listing**
- Users with file.read shall be able to list files within their organization.
- **Source:** apps/api/src/file/file.controller.ts:43-47

**FR-FILE-03 — Presigned URLs**
- Users with file.read shall be able to obtain presigned URLs for direct file access.
- **Source:** apps/api/src/file/file.controller.ts:49-53

**FR-FILE-04 — File Versioning**
- Users with file.upload shall be able to upload new versions of existing files.
- **Source:** apps/api/src/file/file.controller.ts:55-59

**FR-FILE-05 — File Deletion**
- Users with file.delete shall be able to delete files.
- **Source:** apps/api/src/file/file.controller.ts:61-66

### 3.8 Search

**FR-SEARCH-01 — Global Search**
- Users with org.read shall be able to perform global full-text search across tenant-scoped entities.
- The search index is PostgreSQL GIN-backed on search_documents table.
- **Source:** apps/api/src/search/search.controller.ts:12-16, migration search_documents GIN index

### 3.9 Notifications

**FR-NOTIF-01 — List Notifications**
- Authenticated users shall be able to list their notifications.
- Users shall be able to filter by unread status via query parameter.
- **Source:** apps/api/src/notification/notification.controller.ts:10-13

**FR-NOTIF-02 — Unread Count**
- Authenticated users shall be able to retrieve the count of unread notifications.
- **Source:** apps/api/src/notification/notification.controller.ts:15-18

**FR-NOTIF-03 — Mark as Read**
- Users shall be able to mark individual notifications as read.
- Users shall be able to mark all notifications as read at once.
- **Source:** apps/api/src/notification/notification.controller.ts:20-30

### 3.10 Dashboard & Analytics

**FR-DASH-01 — Organization Dashboard KPIs**
- Users with dashboard.read shall be able to view organization-level dashboard KPIs.
- **Source:** apps/api/src/dashboard/dashboard.controller.ts:13-17

**FR-DASH-02 — Revenue Analytics**
- Users with analytics.revenue.read shall be able to view revenue analytics for the organization.
- **Source:** apps/api/src/dashboard/dashboard.controller.ts:19-23

**FR-DASH-03 — User Analytics**
- Users with analytics.user.read shall be able to view user analytics for the organization.
- **Source:** apps/api/src/dashboard/dashboard.controller.ts:25-29

**FR-DASH-04 — AI Spend**
- Users with ai.usage.read shall be able to view AI spend summary for the organization.
- **Source:** apps/api/src/dashboard/dashboard.controller.ts:31-35

### 3.11 Billing & Subscriptions

**FR-BILL-01 — Subscription Management**
- Users with org.billing.read shall be able to view the current subscription for their organization.
- Users with org.billing.manage shall be able to change the subscription plan, optionally applying a coupon and specifying provider details.
- Users with org.billing.manage shall be able to cancel subscriptions, with option atPeriodEnd.
- **Source:** apps/api/src/billing/billing.controller.ts:23-39

**FR-BILL-02 — Invoices**
- Users with org.billing.read shall be able to list invoices for their organization.
- **Source:** apps/api/src/billing/billing.controller.ts:41-45

**FR-BILL-03 — Coupon Management (Platform)**
- Platform admins with platform.billing.manage shall be able to list and create coupon codes.
- **Source:** apps/api/src/billing/billing.controller.ts:47-57

### 3.12 Platform Admin

**FR-ADMIN-01 — Platform Statistics**
- Super admins with platform.read shall be able to view platform-wide statistics.
- **Source:** apps/api/src/admin/admin.controller.ts:13-17

**FR-ADMIN-02 — User Management (Platform)**
- Super admins with platform.users.manage shall be able to list all platform users.
- **Source:** apps/api/src/admin/admin.controller.ts:19-23

**FR-ADMIN-03 — Organization Management (Platform)**
- Super admins with platform.orgs.manage shall be able to list all organizations.
- **Source:** apps/api/src/admin/admin.controller.ts:25-29

**FR-ADMIN-04 — Feature Flags**
- Super admins with platform.feature_flags shall be able to list and create/update feature flags.
- **Source:** apps/api/src/admin/admin.controller.ts:31-41

### 3.13 Health & Monitoring

**FR-HEALTH-01 — Health Check**
- The system shall expose a public health check endpoint verifying database connectivity, memory heap (< 512 MB threshold), and Redis connectivity.
- **Source:** apps/api/src/core/health/health.controller.ts:16-32

**FR-HEALTH-02 — Liveness Probe**
- The system shall expose a public liveness endpoint returning { status: "ok" }.
- **Source:** apps/api/src/core/health/health.controller.ts:34-38

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 Performance

**NFR-PERF-01 — Rate Limiting**
- The API shall enforce a global rate limit of 120 requests per 60 seconds per client.
- **Source:** apps/api/src/app.module.ts:37

**NFR-PERF-02 — Database Indexing**
- The database schema shall include B-tree indexes on foreign keys and tenant-scoping columns (e.g., organizationId, userId, projectId) to support tenant-isolated query patterns.
- **Source:** Migration indexes idx_* on 20+ columns (see ERD doc)

**NFR-PERF-03 — Full-Text Search**
- Global search shall use PostgreSQL GIN indexing for efficient full-text search on search_documents.title and search_documents.body.
- **Source:** Migration idx_search_documents_fts

**[NOT VERIFIED IN CODE] — Request latency SLOs, p95/p99 targets, or load testing configurations are not present in the codebase.**

### 4.2 Security

**NFR-SEC-01 — Authentication**
- The system shall use JWT (HS256) for authentication.
- Access tokens shall have a configurable short TTL (default 15m).
- Refresh tokens shall have a configurable long TTL (default 30d).
- **Source:** apps/api/src/config/app.config.ts:9-10

**NFR-SEC-02 — Authorization**
- The system shall enforce RBAC at the route level using permission guards.
- Super admins shall bypass all permission checks.
- **Source:** apps/api/src/core/guards/permission.guard.ts

**NFR-SEC-03 — Password Hashing**
- The system shall hash passwords using bcryptjs with cost factor 10. [From AGENTS.md — not directly visible in current scan]
- **Source:** AGENTS.md Security section

**NFR-SEC-04 — Secret Management**
- Server-side secrets (JWT_SECRET, STRIPE_SECRET_KEY, OPENAI_API_KEY, etc.) shall not be exposed to client code (no NEXT_PUBLIC_ prefix convention).
- **Source:** AGENTS.md Security section, apps/api/src/config/app.config.ts

**NFR-SEC-05 — CORS**
- The API shall enforce CORS with a configurable FRONTEND_URL origin and credentials: true.
- **Source:** apps/api/src/main.ts:11

**NFR-SEC-06 — Webhook Signature Verification**
- Third-party webhooks (Stripe/Billplz) shall verify signatures using raw request bodies (not parsed JSON).
- **Source:** AGENTS.md Security section

**[NOT VERIFIED IN CODE] — HTTPS enforcement, HSTS headers, CSP headers, or secret rotation policies are not present in the scanned code. These are presumably handled by Nginx in production but are not documented in this repo.**

### 4.3 Scalability

**NFR-SCAL-01 — Multi-Tenancy**
- The system shall support multiple organizations with data isolation enforced by organizationId scoping on every tenant-scoped entity and query.
- **Source:** All controllers and migration schema

**NFR-SCAL-02 — Background Processing**
- The system shall use BullMQ with Redis for asynchronous job processing (email, notifications, AI, reports, cleanup), enabling horizontal scaling of workers.
- **Source:** apps/api/src/core/queue/, apps/api/src/workers/, docker-compose.yml (Redis service)

**[NOT VERIFIED IN CODE] — Horizontal scaling of NestJS instances, database read replicas, or caching strategies beyond Redis session storage are not documented or evident.**

### 4.4 Reliability

**NFR-REL-01 — Health Monitoring**
- The system shall expose Terminus health checks for database, memory, and Redis.
- **Source:** apps/api/src/core/health/health.controller.ts

**NFR-REL-02 — Request Logging**
- The system shall log every HTTP request with method, path, status code, and latency.
- **Source:** apps/api/src/core/logging/request-logging.interceptor.ts

**NFR-REL-03 — Error Standardization**
- All errors shall be returned in a standard ApiResponse envelope with success: false, message, and optional error code.
- **Source:** apps/api/src/core/exception/exception.filter.ts, packages/shared/src/response.ts

**NFR-REL-04 — Session Availability**
- The system shall support token refresh to extend user sessions without re-authentication, provided the refresh token is valid.
- **Source:** apps/web/src/lib/api-client.ts:70-81

### 4.5 Maintainability

**NFR-MAINT-01 — API Documentation**
- The system shall auto-generate Swagger/OpenAPI documentation at /api/docs.
- **Source:** apps/api/src/main.ts:22-30

**NFR-MAINT-02 — Code Organization**
- The backend shall be organized into domain-driven modules (auth, tenant, billing, user, project, ai, file, search, notification, email, admin, dashboard, audit, workers) under the apps/api/src/ directory.
- **Source:** apps/api/src/app.module.ts:43-53

**NFR-MAINT-03 — Database Migrations**
- Schema changes shall be managed via TypeORM migrations.
- Production deployments shall run migrations before starting the app.
- **Source:** docker-compose.yml:60, apps/api/src/config/database.config.ts:12 (migrationsRun: false)

---

## 5. CONSTRAINTS & ASSUMPTIONS

### 5.1 Technical Constraints

| Constraint | Description | Source |
|------------|-------------|--------|
| Node.js >= 20 | Engine requirement | Root package.json:23 |
| PostgreSQL 16 (primary) / MySQL (optional) | Database backing | apps/api/src/config/database.config.ts:8 |
| TypeORM | ORM with migration-based schema management | apps/api/src/database/ |
| NestJS + Next.js monorepo | npm workspaces | Root package.json:7-11 |
| Docker | Required for infrastructure (Postgres, Redis) | docker-compose.yml |
| UUID primary keys | All tables use uuid-ossp UUIDs | Migration |
| No runtime schema sync in prod | DB_SYNCHRONIZE=false in Docker; migrations are mandatory | docker-compose.yml:41 |

### 5.2 Business / Design Assumptions

| Assumption | Rationale | Confidence |
|------------|-----------|------------|
| Email verification email is sent on registration | EmailModule and verify-email endpoint exist | Medium |
| Invitation emails are sent on member invite | emailVerificationToken-like pattern exists for invitations | Medium |
| AI chat calls OpenAI API using configured OPENAI_API_KEY | Config exists; AiModule present | High |
| Stripe webhooks are consumed for subscription state sync | Config exists (stripeWebhookSecret); no controller visible yet | Low [NEEDS CONFIRMATION] |
| Billplz webhooks are consumed for billing events | Mentioned in AGENTS.md; no code visible yet | Low [NEEDS CONFIRMATION] |
| File uploads are stored to local filesystem or S3 based on STORAGE_PROVIDER | Config exists; no explicit controller for download/stream | Medium |
| Audit logs are written by AuditModule decorators/interceptors | Module is imported widely; no explicit write call visible in scanned controllers | Medium |
| Feature flags are evaluated at runtime in addition to admin CRUD | rules column is jsonb; evaluation logic not visible | Medium |

### 5.3 Naming / Data Conventions

| Convention | Value |
|------------|-------|
| API prefix | api (configurable) |
| Auth header | Authorization: Bearer <token> |
| Tenant header | x-organization-id |
| Permission format | resource.action (e.g., project.create) |
| Status enums | Lowercase strings (e.g., active, pending) |
| Role enums | Snake_case strings (e.g., org_owner, super_admin) |

---

## 6. EXTERNAL DEPENDENCIES & INTEGRATIONS REQUIREMENTS

| Dependency | Requirement | Config Key |
|-------------|-------------|------------|
| PostgreSQL 16 | Primary data store | DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD |
| Redis 7 | Cache, session store, BullMQ backend | REDIS_HOST, REDIS_PORT |
| OpenAI API | AI chat completions (for ai.chat) | OPENAI_API_KEY, AI_CHAT_MODEL |
| Google OAuth2 | Social login | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| Stripe | Subscription billing & webhooks | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |
| Email Provider | Transactional emails (SMTP, console, or other) | EMAIL_PROVIDER, EMAIL_FROM |
| Storage Provider | File uploads (local, S3, etc.) | STORAGE_PROVIDER, STORAGE_LOCAL_DIR |

**[NOT VERIFIED IN CODE] — SLOs, retry policies, or circuit breakers for external API calls (OpenAI, Stripe, Google, Email) are not documented in the scanned codebase.**
