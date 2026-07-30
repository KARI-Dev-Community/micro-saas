# SaaS Starter Kit — User Manual

**Version:** 1.0
**Last Updated:** 2026-07-31

A practical guide for getting started with, customizing, and extending the SaaS Starter Kit.

---

## 1. What Is This?

A production-ready, reusable multi-tenant SaaS boilerplate. It gives you a working foundation with authentication, RBAC, organization management, projects/tasks, billing, AI chat, file uploads, search, notifications, admin dashboard, and more — so you can focus on your product logic instead of building infrastructure.

**Stack:** NestJS (backend) + Next.js (frontend) + PostgreSQL + Redis + BullMQ + Docker

---

## 2. Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | >= 20 |
| npm | >= 11 |
| Docker + Docker Compose | (for infrastructure) |
| Git | any |

---

## 3. Quick Start

### 3.1 Clone and install

```bash
git clone <repo-url>
cd saas-starter-kit
npm install
```

### 3.2 Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `JWT_SECRET` — a strong random string (min 32 chars)
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `FRONTEND_URL` — your frontend origin (e.g. `http://localhost:3000`)

### 3.3 Start infrastructure

```bash
npm run docker:up
```

This starts PostgreSQL (`:5432`) and Redis (`:6379`).

### 3.4 Run migrations

```bash
npm run migrate
```

### 3.5 Start the app

```bash
# Terminal 1 — API
npm run dev:api

# Terminal 2 — Frontend
npm run dev:web
```

| URL | Purpose |
|-----|---------|
| http://localhost:3001 | NestJS API (Swagger at `/docs`) |
| http://localhost:3000 | Next.js frontend |

---

## 4. Project Structure

```
saas-starter-kit/
├── apps/
│   ├── api/                  # NestJS backend (port 3001)
│   │   ├── src/
│   │   │   ├── core/         # guards, interceptors, filters, queue, health
│   │   │   ├── auth/         # login, register, 2FA, passkeys, Google OAuth
│   │   │   ├── tenant/       # organizations, workspaces, teams, memberships, RBAC
│   │   │   ├── billing/      # subscriptions, invoices, coupons
│   │   │   ├── user/         # profile, preferences, notification settings
│   │   │   ├── project/      # projects, tasks, comments, activity
│   │   │   ├── ai/           # chat, prompts, usage tracking
│   │   │   ├── file/         # uploads, presigned URLs, versioning
│   │   │   ├── search/       # global full-text search
│   │   │   ├── notification/ # in-app notifications
│   │   │   ├── dashboard/    # KPIs, revenue, analytics
│   │   │   ├── admin/        # platform admin, feature flags
│   │   │   ├── email/        # transactional email (queue-backed)
│   │   │   ├── workers/      # BullMQ consumers
│   │   │   └── database/     # TypeORM migrations
│   │   └── Dockerfile
│   └── web/                  # Next.js frontend (port 3000)
│       └── src/
│           ├── app/          # routes (login, register, dashboard/*)
│           ├── components/   # providers, auth forms, UI
│           └── lib/          # api-client, auth-store (Zustand), rbac
├── packages/
│   └── shared/               # Permission, RoleName, PlanType, ok(), fail()
├── nginx/                    # reverse proxy config
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.web
├── ecosystem.config.js       # PM2 config
└── .env.example
```

---

## 5. How to Add a New Feature Module

The most common task. Follow these steps:

### 5.1 Backend: create the module files

Inside `apps/api/src/`, create a new folder for your feature (e.g. `invoices/`):

```
apps/api/src/invoices/
├── entities/
│   └── invoice.entity.ts
├── dto/
│   ├── create-invoice.dto.ts
│   └── update-invoice.dto.ts
├── services/
│   └── invoice.service.ts
├── controllers/
│   └── invoice.controller.ts
└── invoices.module.ts
```

**Entity** — must have `organizationId` + `@Index()`:

```ts
@Entity("invoices")
@Index(["organizationId", "createdAt"])
export class Invoice extends BaseEntity {
  @Index()
  @Column({ type: "uuid" })
  organizationId!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "varchar", length: 32, default: "active" })
  status!: string;
}
```

**Service** — scope every query by `organizationId`, check permissions, audit:

```ts
@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice) private readonly repo: Repository<Invoice>,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, userId: string, query: Record<string, any>) {
    await this.rbac.assertPermission(userId, organizationId, Permission.INVOICE_READ);
    // ... paginated query scoped by organizationId
  }

  async create(organizationId: string, userId: string, dto: CreateInvoiceDto) {
    await this.rbac.assertPermission(userId, organizationId, Permission.INVOICE_CREATE);
    const item = await this.repo.save(this.repo.create({ organizationId, ...dto }));
    await this.audit.record("invoice", "created", { actorId: userId, organizationId }, { entityType: "invoice", entityId: item.id });
    return item;
  }
  // ... findOne, update, remove
}
```

**Controller** — use `@Permissions(...)` and `@CurrentOrganization()`:

```ts
@Controller("invoices")
@UseGuards(PermissionGuard)
export class InvoiceController {
  constructor(private readonly svc: InvoiceService) {}

  @Get()
  @Permissions(Permission.INVOICE_READ)
  async list(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload) {
    return this.svc.list(orgId!, user.sub, {} as any);
  }

  @Post()
  @Permissions(Permission.INVOICE_CREATE)
  async create(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() dto: CreateInvoiceDto) {
    return this.svc.create(orgId!, user.sub, dto);
  }
  // ... get, update, delete
}
```

**Module** — register in `AppModule`:

```ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    TenantModule,
    BillingModule,
    AuditModule,
  ],
  providers: [InvoiceService],
  controllers: [InvoiceController],
  exports: [InvoiceService],
})
export class InvoiceModule {}
```

### 5.2 Add permissions to shared enums

In `packages/shared/src/enums.ts`, add the new permission values:

```ts
export enum Permission {
  // ... existing
  INVOICE_READ = "invoice.read",
  INVOICE_CREATE = "invoice.create",
  INVOICE_UPDATE = "invoice.update",
  INVOICE_DELETE = "invoice.delete",
}
```

Grant them to the appropriate roles in `ROLE_PERMISSIONS`.

### 5.3 Frontend: create the page

```
apps/web/src/app/dashboard/invoices/
└── page.tsx
```

```tsx
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Can } from "@/components/providers";
import { Permission } from "@shared/enums";

export default function InvoicesPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", activeOrgId],
    queryFn: () => api.get("/api/invoices", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  // ... list, create form, <Can> gating
}
```

### 5.4 Generate and run migration

```bash
npm run migration:generate --workspace apps/api -- name=AddInvoices
npm run migrate --workspace apps/api
```

---

## 6. How to Add a New Permission

1. Add the enum value to `Permission` in `packages/shared/src/enums.ts`
2. Grant it in `ROLE_PERMISSIONS` for the roles that should have access
3. Protect the route with `@Permissions(Permission.YOUR_PERMISSION)`
4. Gate the frontend UI with `<Can permission={Permission.YOUR_PERMISSION}>`

---

## 7. How to Customize the Frontend

### 7.1 Adding a new dashboard page

Create `apps/web/src/app/dashboard/your-feature/page.tsx`. The page is automatically routed at `/dashboard/your-feature`.

Use the patterns from existing pages in `apps/web/src/app/dashboard/projects/`.

### 7.2 Customizing the layout

Edit `apps/web/src/app/layout.tsx` for global shell changes. The `<Providers>` wrapper wraps the entire app — do not remove it.

### 7.3 Changing the theme

The project uses Tailwind CSS with shadcn/ui components. Theme variables are in `apps/web/src/components/ui/`.

---

## 8. How to Configure Billing

### 8.1 Stripe integration

Set these env vars in `.env`:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

The billing module supports plan changes, coupons, and subscription cancellation out of the box.

### 8.2 Adding a new plan

Add the plan value to `PlanType` in `packages/shared/src/enums.ts` and grant the corresponding permissions in `ROLE_PERMISSIONS`.

---

## 9. How to Deploy

### 9.1 Docker Compose (recommended)

```bash
cp .env.example .env
# Fill in all required variables
docker compose up -d --build
```

The app is served at `http://<host>` (Nginx on port 80, proxied to API on 3001 and Web on 3000).

### 9.2 PM2 (bare metal / VPS)

```bash
npm ci
npm run build --workspaces
npm run migrate --workspace apps/api
pm2 start ecosystem.config.js
pm2 save
```

Put Nginx in front for TLS termination and static file serving.

### 9.3 Production checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Set non-default database credentials
- [ ] Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` if billing is enabled
- [ ] Configure `OPENAI_API_KEY` if AI features are enabled
- [ ] Configure a real email provider (not `console`)
- [ ] Set `DB_SYNCHRONIZE=false` (always false in production)
- [ ] Run migrations before starting the app
- [ ] Enable HTTPS via Nginx/Certbot

---

## 10. Common Tasks

### 10.1 Creating a new organization

Call `POST /api/organizations` with `{ name, slug? }`. The creator automatically becomes the `org_owner`.

### 10.2 Inviting a member

Call `POST /api/organizations/:id/members/invite` with `{ email, role }`. The invitee receives an email with a token to accept.

### 10.3 Changing a member's role

Call `POST /api/organizations/:id/members/:mid/role` with `{ role }`.

### 10.4 Viewing AI usage

Call `GET /api/ai/usage` with `org.billing.read` permission.

### 10.5 Uploading a file

Call `POST /api/files/upload` with query params (`fileName`, `mimeType`, `sizeBytes`, `visibility`) and a `base64` body.

### 10.6 Searching across the org

Call `GET /api/search/global?q=<query>` with `org.read` permission.

---

## 11. Key Conventions

| Convention | Value |
|------------|-------|
| API base URL | `/api` (proxied by Nginx to `:3001`) |
| Auth header | `Authorization: Bearer <token>` |
| Tenant header | `x-organization-id` |
| Response envelope | `{ success, message, data, meta }` |
| Permission format | `resource.action` (e.g. `project.create`) |
| All tenant queries | Scoped by `organizationId` |
| DTO validation | `class-validator` + `ValidationPipe` |
| Password hashing | `bcryptjs` cost 10 |
| Token signing | `HS256` via `JWT_SECRET` |

---

## 12. Troubleshooting

### 12.1 API returns 401 on every request

- Check that `JWT_SECRET` is set and matches between API and frontend
- Verify the access token is being sent as `Authorization: Bearer <token>`
- Check that the token hasn't expired (default 15m) — the frontend auto-refreshes on 401

### 12.2 CORS errors

- Set `FRONTEND_URL` in `.env` to match your frontend origin
- Restart the API after changing `.env`

### 12.3 Migrations fail on startup

- Ensure PostgreSQL is running and accessible
- Check `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- Run `npm run migrate` manually to see detailed errors

### 12.4 "Permission denied" on a route

- Verify the user has an active membership in the organization
- Check that the `x-organization-id` header is being sent
- Verify the permission is granted to the user's role in `ROLE_PERMISSIONS`

### 12.5 Docker Compose won't start

- Ensure Docker Desktop / Docker daemon is running
- Check that ports 5432, 6379, 3000, 3001 are not already in use
- Run `docker compose down` first if containers are in a bad state

---

## 13. Where to Find More

| Resource | Path |
|----------|------|
| Full API spec | `docs/api-specification.md` |
| Database schema | `docs/database-schema.md` |
| RBAC permission matrix | `docs/RBAC.md` |
| Multi-tenancy architecture | `docs/MULTITENANT.md` |
| Auth flow | `docs/AUTH_FLOW.md` |
| Code patterns | `docs/PATTERNS.md` |
| Module template | `docs/MODULE_TEMPLATE.md` |
| AI prompt templates | `docs/AI_PROMPTS.md` |
| Deployment guide | `docs/DEPLOYMENT.md` |
| Requirements spec | `docs/requirements.md` |
| Architecture design | `docs/architecture-design.md` |
