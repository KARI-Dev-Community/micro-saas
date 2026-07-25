# QA Bug Report — Full URL Testing (`localhost:8080`)

**Date:** 2026-07-25  
**Target URL:** `http://localhost:8080`  
**Test Scope:** Web pages, public API endpoints, protected API endpoints, health checks, HTTP method validation

---

## Summary

### Round 1 — Register Endpoint Focus
**Total Tests:** 39  
**Passed:** 9 (23.1%)  
**Failed:** 30 (76.9%)

### Round 2 — All Public-Facing URLs
**Total Tests:** 76  
**Passed:** 11 (14.5%)  
**Failed:** 65 (85.5%)

**Critical Bugs Found:** 2 major bugs affecting ALL API functionality  
**Minor Issue:** 1 code quality issue

---

## Bug #1 — GLOBAL `JwtAuthGuard` BLOCKS ALL API ENDPOINTS (CRITICAL)

- **Severity:** Critical (blocks entire API)
- **Location:** `apps/api/src/app.module.ts` — Global guard registration
- **Affected Endpoints:** ALL `/api/*` routes

### Root Cause

In `app.module.ts`, `JwtAuthGuard` is registered as a **global** guard (`APP_GUARD`), which applies to **all** API routes including public ones like registration, login, forgot-password, health checks, etc.:

```typescript
{ provide: APP_GUARD, useClass: JwtAuthGuard }
```

Route handlers like `AuthController.register()`, `AuthController.login()`, `HealthController.check()`, etc. have **no** guard exemption or `@Public()` decorator. As a result, every request to any `/api/*` endpoint is rejected with **HTTP 401 Unauthorized** before the route handler ever executes.

### Evidence

**Direct call** from the nginx container (bypassing any proxy issues):
```
$ curl -s http://api:3001/api/auth/register -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@x.com","password":"password123"}'
{"success":false,"message":"Authentication required","data":null,"meta":null}
HTTP/1.1 401 Unauthorized
```

**Health endpoint** (which should be public):
```
$ curl -s http://api:3001/api/health
HTTP/1.1 401 Unauthorized
```

**Login endpoint** (also public but blocked):
```
$ curl -s http://api:3001/api/auth/login -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"password123"}'
{"success":false,"message":"Authentication required","data":null,"meta":null}
HTTP/1.1 401 Unauthorized
```

The NestJS logs confirm ALL routes ARE properly registered (77 routes mapped), but the global guard intercepts every request.

### Impact

- **No user can register** through the API
- **No user can log in** — breaking all authentication flows
- **No user can reset/forgot password**
- **Health checks are blocked** — breaking monitoring and Kubernetes liveness probes
- **All protected endpoints** are also blocked, but that's expected to require auth
- **All public endpoints** (register, login, forgot-password, reset-password, verify-email, health) are incorrectly gated

### Fix

Create a `@Public()` decorator or metadata flag that the `JwtAuthGuard` checks to skip authentication for specific routes. Example:

```typescript
// In AuthController
@Post("register")
@Public()  // <-- skip global auth guard
async register(@Body() dto: RegisterDto, @Req() req: Request) { ... }

@Post("login")
@Public()
async login(@Body() dto: LoginDto, @Req() req: Request) { ... }

@Get("verify-email")
@Public()
async verifyEmail(@Query("token") token: string, @Res() res: Response) { ... }

@Post("forgot-password")
@Public()
async forgot(@Body() dto: ForgotPasswordDto) { ... }

@Post("reset-password")
@Public()
async reset(@Body() dto: ResetPasswordDto) { ... }

// In HealthController
@Get("live")
@Public()
async liveness() { ... }
```

Alternatively, modify `JwtAuthGuard` to check for a `@Public()` metadata flag:

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (request.route?.config?.public) return true;
    return super.canActivate(context);
  }
}
```

---

## Bug #2 — NGINX `proxy_pass` STRIPS SUBPATHS FOR `/api/` ROUTES (CRITICAL)

- **Severity:** Critical (all `/api/*` routes return 404 through the public-facing nginx host)
- **Location:** `nginx/default.conf` — `proxy_pass` directive
- **Affected URLs:** `http://localhost:8080/api/*`

### Root Cause

The nginx configuration uses a **variable** in `proxy_pass`, which prevents proper URI path rewriting:

```nginx
location /api/ {
    set $backend_api http://api:3001;
    proxy_pass $backend_api/api/;
```

When `proxy_pass` references a variable for the upstream (instead of a static URL), nginx **cannot** perform automatic URI replacement of the matched location prefix. As a result, a request to `POST /api/auth/register` is forwarded to the backend as **`POST /api/`** (the subpath `auth/register` is dropped), causing a 404.

### Evidence

**Through the public nginx proxy** at `localhost:8080`:
```
$ curl -sv http://localhost:8080/api/auth/register -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@x.com","password":"password123"}'

< HTTP/1.1 404 Not Found
< Content-Type: application/json; charset=utf-8
{"success":false,"message":"Cannot POST /api/","data":null,"meta":null}
```

The response body says `Cannot POST /api/` — the subpath `auth/register` is missing.

The same stripping affects ALL methods and paths:
- `GET /api/health/live` → `Cannot GET /api/` (404)
- `GET /api/auth/login` → `Cannot GET /api/` (404)
- `DELETE /api/files/0000` → `Cannot DELETE /api/` (404)
- `PATCH /api/users/me/profile` → `Cannot POST /api/` (404 — method gets normalized!)
- `POST /api/project` → `Cannot POST /api/` (404)

**But direct access** to the backend (from inside the nginx container) works correctly:
```
$ docker exec nginx-container curl -s http://api:3001/api/auth/register -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@x.com","password":"password123"}'
HTTP/1.1 401 Unauthorized   ← route IS reached (but blocked by Bug #1)
```

### Impact

- **ALL API endpoints under `/api/` return 404** when accessed through `localhost:8080`
- The entire API is effectively unreachable from the public-facing URL
- Frontend pages (which call `/api/auth/register`, `/api/auth/login`, etc.) cannot communicate with the backend
- Monitoring and health checks fail
- Billing, project management, user profile, notifications, file uploads — ALL are broken
- The web app's registration, login, dashboard, and all other features are non-functional

### Confirmed Scope

Every single `/api/*` route returns 404 through nginx. This was verified across all route categories:
| Route Category | Routes Tested | Result |
|---|---|---|
| Auth (public) | register, login, forgot-password, reset-password, verify-email | 404 (subpath stripped) |
| Auth (protected) | me, refresh, logout, change-password | 404 (subpath stripped) |
| Security/2FA | enable, disable, confirm, passkeys, sessions | 404 (subpath stripped) |
| Organizations | CRUD, members, teams, workspaces | 404 (subpath stripped) |
| Projects | CRUD, tasks, comments | 404 (subpath stripped) |
| Billing | subscription, coupons, invoices | 404 (subpath stripped) |
| Dashboard | org, revenue, users, ai-spend | 404 (subpath stripped) |
| AI | chat, conversations, prompts, usage | 404 (subpath stripped) |
| User profile | profile, preferences, avatar, notifications | 404 (subpath stripped) |
| Files | upload, presign, versions, delete | 404 (subpath stripped) |
| Notifications | CRUD, read-all, unread-count | 404 (subpath stripped) |
| Health | /health, /health/live (via /api/) | 404 (subpath stripped) |

### Fix

Replace the variable-based `proxy_pass` with a static URL to enable proper URI rewriting:

```nginx
location /api/ {
    proxy_pass http://api:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**OR** remove the variable and use a direct upstream reference:

```nginx
upstream api_backend {
    server api:3001;
}

location /api/ {
    proxy_pass http://api_backend/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    ...
}
```

---

## Bug #3 — HEALTH ENDPOINTS PARTIALLY BROKEN (MODERATE)

- **Severity:** Moderate (health monitoring is degraded)
- **Location:** `nginx/default.conf` AND `app.module.ts` (global guard)
- **Affected Endpoints:** `GET /health`, `GET /api/health`, `GET /api/health/live`

### Root Cause

Two compounding issues:
1. `GET /health` (without `/api/` prefix) returns 401 from the JwtAuthGuard (Bug #1) — this is the health check that `nginx` itself calls
2. `GET /api/health/live` through nginx returns 404 because Bug #2 strips the subpath
3. Only `GET /health/live` (served directly by nginx routing, not proxied) returns the expected 401 auth error

The Docker healthcheck for the `api` container uses `nc -z localhost 3001`, which works at the TCP level but doesn't validate the application-level health response. The `nginx` container's healthcheck (`nc -z localhost 3000`) works for the web but there's no nginx-level healthcheck for the API.

### Impact

- Kubernetes/Docker liveness probes on `/health` will fail (401 instead of healthy response)
- Monitoring dashboards cannot check API health through the public URL
- The `/api/health` endpoint is completely unreachable through nginx

### Fix

1. Mark the health endpoint as `@Public()` (Bug #1 fix)
2. Fix nginx proxy_pass (Bug #2 fix)  
3. Add nginx-level healthcheck for the API service in docker-compose.yml

---

## Bug #4 — REDUNDANT GLOBAL `JwtAuthGuard` + PER-ROUTE `@UseGuards` DUPLICATION (MINOR)

- **Severity:** Low (code quality / maintenance concern)
- **Location:** `apps/api/src/app.module.ts` and `apps/api/src/auth/auth.controller.ts`

### Root Cause

`JwtAuthGuard` is registered as a global guard in `AppModule`, **and** is also explicitly applied to individual controller methods via `@UseGuards(JwtAuthGuard)`:

```typescript
// app.module.ts
{ provide: APP_GUARD, useClass: JwtAuthGuard }  // global — applies everywhere

// auth.controller.ts
@Get("me")
@UseGuards(JwtAuthGuard)  // redundant when already global
async me(@AuthUser() user: AccessTokenPayload) { ... }
```

The per-route `@UseGuards(JwtAuthGuard)` decorators on the auth controller methods are redundant since the global guard already applies them. While this doesn't cause a bug, it creates confusion and makes the code harder to maintain.

### Fix

Remove the redundant `@UseGuards(JwtAuthGuard)` from controller methods. Keep either global or per-route, not both. If fine-grained control is needed for public routes, use a `@Public()` bypass pattern instead.

---

## Test Case Results — Round 2 (All URLs)

### Web Pages (all passed — 11/11)
| # | URL | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | GET `/` (home) | HTTP 200 | HTTP 200 | ✅ |
| 2 | GET `/login` | HTTP 200 + "Sign in" | HTTP 200 + "Sign in" | ✅ |
| 3 | GET `/register` | HTTP 200 + "Create account" | HTTP 200 + "Create account" | ✅ |
| 4 | GET `/forgot-password` | HTTP 200 + "forgot" | HTTP 200 + "forgot" | ✅ |
| 5 | GET `/dashboard` | HTTP 200 | HTTP 200 | ✅ |
| 6 | GET `/dashboard/admin` | HTTP 200 | HTTP 200 | ✅ |
| 7 | GET `/dashboard/ai` | HTTP 200 | HTTP 200 | ✅ |
| 8 | GET `/dashboard/billing` | HTTP 200 | HTTP 200 | ✅ |
| 9 | GET `/dashboard/projects` | HTTP 200 | HTTP 200 | ✅ |

### Health Endpoints
| # | URL | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | GET `/api/health` | 401 (blocked by Bug #1) | 404 (Bug #2 strips subpath) | ❌ |
| 2 | GET `/api/health/live` | 401 (blocked by Bug #1) | 404 (Bug #2 strips subpath) | ❌ |
| 3 | GET `/health/live` (root proxy) | 401 | 401 | ✅ |

### Public Auth Endpoints (all blocked by Bug #1 + Bug #2)
| # | Method | URL | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/register` | 401 (Bug #1) | 404 (Bug #2) | ❌ |
| 2 | POST | `/api/auth/login` | 401 (Bug #1) | 404 (Bug #2) | ❌ |
| 3 | POST | `/api/auth/forgot-password` | 401 (Bug #1) | 404 (Bug #2) | ❌ |
| 4 | POST | `/api/auth/reset-password` | 401 (Bug #1) | 404 (Bug #2) | ❌ |
| 5 | GET | `/api/auth/verify-email` | 401 (Bug #1) | 404 (Bug #2) | ❌ |
| 6 | GET | `/api/auth/google/login` | 401 (Bug #1) | 404 (Bug #2) | ❌ |
| 7 | GET | `/api/auth/google/callback` | 401 (Bug #1) | 404 (Bug #2) | ❌ |

### Protected Auth Endpoints (all blocked by Bug #1 + Bug #2)
| # | Method | URL | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1 | GET | `/api/auth/me` | 401 | 404 | ❌ |
| 2 | POST | `/api/auth/refresh` | 401 | 404 | ❌ |
| 3 | POST | `/api/auth/logout` | 401 | 404 | ❌ |
| 4 | POST | `/api/auth/logout-all` | 401 | 404 | ❌ |
| 5 | POST | `/api/auth/change-password` | 401 | 404 | ❌ |

### Organizations (all blocked by Bug #1 + Bug #2)
| # | Method | URL | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1 | GET | `/api/organizations/mine` | 401 | 404 | ❌ |
| 2 | POST | `/api/organizations` | 401 | 404 | ❌ |
| 3 | GET | `/api/organizations/0000` | 401 | 404 | ❌ |

### Projects (all blocked by Bug #1 + Bug #2)
| # | Method | URL | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1 | GET | `/api/projects` | 401 | 404 | ❌ |
| 2 | POST | `/api/projects` | 401 | 404 | ❌ |
| 3 | GET | `/api/projects/:id/tasks` | 401 | 404 | ❌ |

### Billing (all blocked by Bug #1 + Bug #2)
All 5 endpoints return 404 instead of expected 401. ❌

### Dashboard (all blocked by Bug #1 + Bug #2)
All 4 endpoints return 404 instead of expected 401. ❌

### AI (all blocked by Bug #1 + Bug #2)
All 5 endpoints return 404 instead of expected 401. ❌

### User Profile (all blocked by Bug #1 + Bug #2)
All 9 endpoints return 404 instead of expected 401. ❌

### Files (all blocked by Bug #1 + Bug #2)
All 6 endpoints return 404 instead of expected 401. ❌

### Notifications (all blocked by Bug #1 + Bug #2)
All 5 endpoints return 404 instead of expected 401. ❌

### Search (all blocked by Bug #1 + Bug #2)
| # | Method | URL | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1 | GET | `/api/search/global` | 401 | 404 | ❌ |

### HTTP Method Validation (all blocked by Bug #2)
All 4 tests return 404 instead of expected 405. ❌

---

## Key Insight

The two bugs are **compounding** — Bug #2 (nginx subpath stripping) makes all API calls return 404, while Bug #1 (global auth guard) would make all unauthenticated API calls return 401 once Bug #2 is fixed. Both must be resolved for the API to function correctly.

**Priority order for fixes:**
1. **Bug #2 (nginx proxy_pass)** — This is the most critical as it breaks ALL API access through the public URL
2. **Bug #1 (global JwtAuthGuard)** — Without fixing this, public endpoints remain blocked even after Bug #2 is resolved
3. **Bug #3 (health checks)** — Important for container orchestration and monitoring
4. **Bug #4 (code duplication)** — Low priority cleanup

## Bug #1 — GLOBAL `JwtAuthGuard` BLOCKS PUBLIC REGISTER ENDPOINT (CRITICAL)

- **Severity:** Critical (blocks all registration functionality)
- **Location:** `apps/api/src/app.module.ts:63` — Global guard registration
- **Affected Endpoint:** `POST /api/auth/register`

### Root Cause

In `app.module.ts`, `JwtAuthGuard` is registered as a **global** guard (`APP_GUARD`), which applies to **all** API routes including public ones like registration:

```typescript
{ provide: APP_GUARD, useClass: JwtAuthGuard }
```

The `AuthController.register()` method at `apps/api/src/auth/auth.controller.ts:41` has **no** `@UseGuards()` decorator to opt out of the global guard. As a result, every request to `POST /api/auth/register` is rejected with **HTTP 401 Unauthorized** before the route handler ever executes.

### Evidence

Direct call from the nginx container (bypassing any proxy issues):

```
$ curl -s http://api:3001/api/auth/register -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@x.com","password":"password123"}'
{"success":false,"message":"Authentication required","data":null,"meta":null}
HTTP/1.1 401 Unauthorized
```

The NestJS logs confirm the route IS properly registered:
```
[RouterExplorer] Mapped {/api/auth/register, POST} route
```

But the global guard intercepts the request and returns 401 before `AuthController.register()` can process it.

### Impact

- No user can register through the API
- The login endpoint (`/api/auth/login`) is also blocked by the same guard, breaking all auth flows
- All public endpoints under `/api/auth/` (`verify-email`, `forgot-password`, `reset-password`) are similarly blocked

### Fix

Add `@Public()` decorator or `@UseGuards()` exemption to public route methods. For example, in the `AuthController`:

```typescript
@Post("register")
@Public()
async register(@Body() dto: RegisterDto, @Req() req: Request) {
```

Or alternatively, configure the `JwtAuthGuard` to skip public routes via a metadata flag.

---

## Bug #2 — NGINX `proxy_pass` STRIPS SUBPATHS FOR `/api/` ROUTES (CRITICAL)

- **Severity:** Critical (all `/api/*` routes return 404 through the public-facing nginx host)
- **Location:** `nginx/default.conf` — `proxy_pass` directive
- **Affected URLs:** `http://localhost:8080/api/*`

### Root Cause

The nginx configuration uses a **variable** in `proxy_pass`, which prevents proper URI path rewriting:

```nginx
location /api/ {
    set $backend_api http://api:3001;
    proxy_pass $backend_api/api/;
```

When `proxy_pass` references a variable for the upstream (instead of a static URL), nginx **cannot** perform automatic URI replacement of the matched location prefix. As a result, a request to `POST /api/auth/register` is forwarded to the backend as **`POST /api/`** (the subpath `auth/register` is dropped), causing a 404.

### Evidence

Through the public nginx proxy at `localhost:8080`:

```
$ curl -sv http://localhost:8080/api/auth/register -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@x.com","password":"password123"}'

< HTTP/1.1 404 Not Found
< Content-Type: application/json; charset=utf-8
{"success":false,"message":"Cannot POST /api/","data":null,"meta":null}
```

The response body says `Cannot POST /api/` — the subpath `auth/register` is missing.

But direct access to the backend (from inside the nginx container) works fine (aside from the auth guard issue):

```
$ docker exec nginx-container curl -s http://api:3001/api/auth/register -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@x.com","password":"password123"}'
HTTP/1.1 401 Unauthorized   ← route IS reached (but blocked by Bug #1)
```

### Impact

- All API endpoints under `/api/` return 404 when accessed through `localhost:8080`
- The entire API is effectively unreachable from the public-facing URL
- Frontend pages (which call `/api/auth/register`, `/api/auth/login`, etc.) cannot communicate with the backend

### Fix

Replace the variable-based `proxy_pass` with a static URL to enable proper URI rewriting:

```nginx
location /api/ {
    proxy_pass http://api:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## Bug #3 — REDUNDANT GLOBAL `JwtAuthGuard` + PER-ROUTE `@UseGuards` DUPLICATION (MINOR)

- **Severity:** Low (code quality / maintenance concern)
- **Location:** `apps/api/src/app.module.ts` and `apps/api/src/auth/auth.controller.ts`

### Root Cause

`JwtAuthGuard` is registered as a global guard in `AppModule`, **and** is also explicitly applied to individual controller methods via `@UseGuards(JwtAuthGuard)` (e.g., `me`, `logoutAll`, `changePassword`):

```typescript
// app.module.ts
{ provide: APP_GUARD, useClass: JwtAuthGuard }  // global — applies everywhere

// auth.controller.ts
@Get("me")
@UseGuards(JwtAuthGuard)  // redundant when already global
async me(@AuthUser() user: AccessTokenPayload) { ... }
```

The per-route `@UseGuards(JwtAuthGuard)` decorators on the auth controller methods are redundant since the global guard already applies them. While this doesn't cause a bug, it creates confusion and makes the code harder to maintain — developers might mistakenly believe those methods need the guard to work, not realizing the global guard already covers them.

### Fix

Remove the redundant `@UseGuards(JwtAuthGuard)` from controller methods. Keep either global or per-route, not both. If fine-grained control is needed for public routes, use a `@Public()` bypass pattern instead.

---

## Test Case Results Detail

### Page Rendering (all passed — 7/7)
| # | Test | Expected | Actual | Result |
|---|------|----------|--------|--------|
| 1 | Register page loads | HTTP 200 + "Create account" | HTTP 200 + "Create account" | ✅ PASS |
| 2 | Email field present | `id="email"` in HTML | Present | ✅ PASS |
| 3 | Password field present | `id="password"` in HTML | Present | ✅ PASS |
| 4 | First name field present | `id="firstName"` in HTML | Present | ✅ PASS |
| 5 | Last name field present | `id="lastName"` in HTML | Present | ✅ PASS |
| 6 | Submit button present | "Create account" text | Present | ✅ PASS |
| 7 | Login link present | `href="/login"` | Present | ✅ PASS |

### API Endpoint — All Return 404 "Cannot POST /api/" (all failed — 30/30)
| Category | Tests | Expected | Actual | Result |
|----------|-------|----------|--------|--------|
| Valid registration (3 tests) | 200 | 404 | ❌ |
| Invalid email (6 tests) | 400 | 404 | ❌ |
| Invalid password (6 tests) | 400 | 404 | ❌ |
| Duplicate email (2 tests) | 200/409 | 404 | ❌ |
| Edge cases (8 tests) | 400 | 404 | ❌ |
| HTTP methods (4 tests) | 405/404 | 401/404 | ❌ |
| CORS/security (2 tests) | 400 | 404 | ❌ |

> Note: The 404 responses all have the body `{"success":false,"message":"Cannot POST /api/"}` — confirming the subpath is being stripped by nginx (Bug #2). Even if the subpath issue were fixed, all requests would then be blocked by the global `JwtAuthGuard` (Bug #1), returning 401 instead.

