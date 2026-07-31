# Monolith Performance Audit

**Date:** 2026-07-31  
**Scope:** NestJS API (`apps/api`) + Next.js frontend (`apps/web`) — single-host monolith (Docker Compose / PM2 cluster mode)  
**Method:** Static codebase audit across all entities, services, controllers, config, Docker, and frontend. TypeScript `tsc --noEmit` used to validate type-level issues.

---

## BLOCKER (prevents build/start)

### 1. `RbacService.isSuperAdmin` is called but not defined — compilation fails

**Location:** `apps/api/src/auth/auth.controller.ts:120,124`  
**Issue:** Calls `this.rbac.isSuperAdmin(user.sub)` but `RbacService` (`rbac.service.ts`) has no `isSuperAdmin` method. `tsc --noEmit` reports 2 errors:
```
apps/api/src/auth/auth.controller.ts(120,29): error TS2339: Property 'isSuperAdmin' does not exist on type 'RbacService'.
apps/api/src/auth/auth.controller.ts(124,32): error TS2339: Property 'isSuperAdmin' does not exist on type 'RbacService'.
```
The Docker `build` step (`npm run build --workspace apps/api`) will fail. The API cannot start.

**Fix:** Add `isSuperAdmin(userId: string): Promise<boolean>` to `RbacService`:
```ts
async isSuperAdmin(userId: string): Promise<boolean> {
  const m = await this.membershipRepo.findOne({
    where: { userId, status: MembershipStatus.ACTIVE },
    select: ["role"],
  });
  return m?.role === RoleName.SUPER_ADMIN;
}
```

---

## Tier 1 — Per-Request DB Overhead (affects every request)

### 2. PermissionGuard makes 2 DB round-trips per request — JWT perms ignored

**Location:** `permission.guard.ts:55`, `rbac.service.ts:23-44`

The `PermissionGuard` calls `rbac.getUserPermissions(user.sub, orgId)` on **every** protected request. This fires 2 DB queries:

```ts
// rbac.service.ts:23 — query 1 (loads unused organization relation)
this.membershipRepo.findOne({
  where: { userId, organizationId, status: MembershipStatus.ACTIVE },
  relations: ["organization"],   // ← never used in the guard
})

// rbac.service.ts:40 — query 2 (loads all permissions for the role)
this.roleRepo.findOne({
  where: { name: roleKey },
  relations: ["permissions"],
})
```

The JWT already embeds `perms: string[]` (`token.service.ts:12,37`). The `JwtStrategy.validate` returns the full payload (`jwt.strategy.ts:17`). **The guard ignores the token's embedded permissions and re-fetches from DB.**

At the 120 req/min global rate limit, this is **240 DB queries per minute** just for auth — scaling linearly with traffic.

**Fix:** Read `user.perms` from the JWT payload in the guard. Skip the DB call entirely on the happy path. Cache the fallback in Redis with a 60s TTL for cases where perms are absent.

```ts
// Before: 2 DB round-trips, ~4-8ms each + object materialization
const { role, permissions } = await this.rbac.getUserPermissions(user.sub, organizationId);

// After: 0 DB round-trips, ~0.01ms
const permissions = user.perms ?? (await this.rbac.getUserPermissions(user.sub, organizationId)).permissions;
```

### 3. Redundant `assertPermission` calls in services (double permission check)

**Location:** `dashboard.service.ts:25,35,44`, `billing.service.ts:41,70`, `tenant.service.ts:95,116,158,172,181,198,219`, `ai.service.ts:41`, `project.service.ts:37,47,65,83`

Services call `assertPermission` on paths already protected by `@Permissions()` on the controller. Example:

```
Controller @Permissions(DASHBOARD_READ)
  → PermissionGuard checks perms (1x DB: membership + role)
  → DashboardService.orgDashboard() calls rbac.assertPermission() (2x more DB queries)
```

**Fix:** Remove `assertPermission` calls from services for routes already protected by `@Permissions()`. Keep `assertPermission` only for internal cross-cutting checks (e.g., `createProject` enforcing the free-tier plan).

### 4. Role entity uses eager loading for permissions

**Location:** `role.entity.ts:26`

```ts
@ManyToMany(() => Permission, (p) => p.roles, { eager: true })
permissions!: Permission[];
```

This fires aJOIN + loads ALL permissions for **every** Role query across the entire application — the seeder, the guard, the dashboard, billing, admin. Combined with the explicit `relations: ["permissions"]` already specified in queries, this is redundant.

**Fix:** Remove `{ eager: true }`. Permissions are loaded explicitly only in `rbac.service.ts` and `rbac.seeder.ts` via `relations: ["permissions"]`.

---

## Tier 2 — Event Loop Blocking (blocks ALL concurrent requests)

### 5. Synchronous file I/O in FileService

**Location:** `file.service.ts:35,36,66,89`

```ts
fs.mkdirSync(dir, { recursive: true });          // blocks event loop
fs.writeFileSync(path.join(dir, key), buffer);   // blocks — ~50ms for 5MB
fs.writeFileSync(..., buffer);                    // blocks
fs.unlinkSync(...);                               // blocks
```

For a 10MB upload, `fs.writeFileSync` blocks the event loop for ~50-100ms. Any concurrent request to ANY endpoint during the write gets queued. Under concurrent uploads, this cascades.

**Fix:** Use async `fs.promises.writeFile()`. For production, move uploads to a BullMQ worker to completely isolate I/O from the request path.

### 6. bcryptjs blocks the event loop on auth

**Location:** `auth.service.ts:44,111`

```ts
await bcrypt.hash(pw, 10);     // ~100-300ms of pure CPU on the JS thread
await bcrypt.compare(password, user.passwordHash);  // ~100-300ms
```

`bcryptjs` is a pure-JS implementation — it does NOT use the libuv thread pool. Every login/register blocks the entire event loop. At 50 concurrent logins, you get 5-15 seconds of serialized CPU blocking.

**Fix:** Switch to `bcrypt` (native bindings) or `@node-rs/argon2` (Rust via Neon), both of which offload to the libuv thread pool. Alternatively, move hashing to a Worker Thread via `worker_threads`.

---

## Tier 3 — Inline Blocking I/O (high-latency requests)

### 7. AI chat blocks the request on synchronous OpenAI call + double execution

**Location:** `ai.service.ts:51-61`, `ai.consumer.ts:25-26`

```ts
// ai.service.ts:51 — enqueues the job to BullMQ (good — non-blocking)
const job = await this.queues.add(QUEUE_NAMES.AI, "chat", {...}, { attempts: 2 });

// ai.service.ts:61 — BUT ALSO calls the API synchronously right here — blocks the request
const reply = await this.runCompletion(input.prompt, input.systemPrompt);
```

Then `ai.consumer.ts:25-26` processes the SAME job and calls `complete()` — a **duplicate OpenAI API call**. The worker's result is discarded (comment: "usage tracking omitted here; AiService tracks it on the request path").

Each AI chat request blocks the event loop for 1–5+ seconds (OpenAI latency) and fires 2 API calls instead of 1.

**Fix:** Remove the synchronous `runCompletion` call. Return `{ jobId, status: "processing" }` immediately. Let the worker's result be fetched via polling or SSE streaming.

### 8. Audit logging blocks every mutation (fire-and-forget should be async)

**Location:** `audit.service.ts:44-45`

```ts
await this.repo.save(log);  // DB write on every mutation
```

Called with `await` from `createProject` (line 60), `login` (line 122), `register` (line 76), `verifyEmail` (line 101), etc. Each adds a DB round-trip to the request path.

**Fix:** Enqueue audit logs via BullMQ (fire-and-forget) instead of `await`-ing the DB save. This decouples audit logging from request latency.

---

## Tier 4 — Missing DB Indexes

| Location | Query Pattern | Missing Index |
|----------|--------------|---------------|
| `rbac.service.ts:23` | `findOne({ userId, organizationId, status })` | Composite `(userId, organizationId, status)` on `memberships` |
| `notification.service.ts:51` | `find({ userId, status: UNREAD })` and `count({ userId, status: UNREAD })` | Composite `(userId, status)` on `notifications` |
| `file.entity.ts:13-14` | `find({ organizationId })` | `@Index()` on `organizationId` — currently NO index at all |
| `rbac.service.ts:36` | `roleRepo.find({ where: { name: SUPER_ADMIN } })` | Use `findOne` instead of `find` for single role lookup |

---

## Tier 5 — Caching Layer (missed opportunity)

### 9. Redis is available but unused for caching

`RedisModule` is global (`redis.module.ts`) and `RedisService` is functional. Only used for:
- Refresh token revocation
- File presigned token storage

**Not used for:**
- Permission caching (the #1 win from Tier 1)
- Response caching for dashboard/analytics/project-lists

**Fix:** Add `@nestjs/cache-manager` with Redis store. Cache:
- User permissions for 60s: `perm_cache:{userId}:{orgId}`
- Dashboard KPIs for 30s: `dashboard:{orgId}`
- Project lists for 15s: `projects:{orgId}:{page}`

### 10. Duplicate Redis connection in QueueRegistry

**Location:** `queue.registry.ts:23`, `redis.service.ts:13`

```ts
// RedisService (for cache/revocation)
this.client = new IORedis({ host, port, password, ... });

// QueueRegistry (for BullMQ)
this.connection = new IORedis({ host, port, password, ... });
```

Two TCP connections to Redis when one would suffice. Under PM2 cluster mode with `instances: "max"`, each worker process creates its own set of 2 connections.

**Fix:** Share a single IORedis instance. `QueueRegistry` should accept an `IORedis` instance via DI from `RedisService`.

---

## Tier 6 — Data Materialization Issues

### 11. `listMembers` loads full User + Organization entities

**Location:** `tenant.service.ts:182-186`

```ts
this.memberships.find({
  where: { organizationId },
  relations: ["user", "organization"],  // full entity materialization
  order: { createdAt: "ASC" },
})
```

For an org with 1,000 members, this instantiates 1,000 User objects + 1,000 Organization objects. The UI only needs member name, email, and role.

**Fix:** Use QueryBuilder with `leftJoinAndSelect` + `addSelect` for specific columns only, or a raw query.

### 12. `userAnalytics` loads all memberships to count them

**Location:** `dashboard.service.ts:45-49`

```ts
const members = await this.orgs
  .createQueryBuilder("o")
  .relation(Organization, "memberships")
  .of(organizationId)
  .loadMany();  // loads ALL membership entities
return { members: (members as any[]).length };
```

Loads and materializes N entities just to count them.

**Fix:** `this.memberships.count({ where: { organizationId } })` — a single `SELECT COUNT(*)`.

### 13. `aiSpend` loads all usage rows to sum them

**Location:** `dashboard.service.ts:53-58`

```ts
const rows = await this.usage.find({ where: { organizationId } });
return {
  totalUsd: rows.reduce((s, r) => s + Number(r.costUsd), 0),
  requests: rows.reduce((s, r) => s + r.requestCount, 0),
};
```

**Fix:** Use SQL aggregation:
```ts
this.usage
  .createQueryBuilder("u")
  .select(["SUM(u.costUsd) as totalUsd", "SUM(u.requestCount) as requests"])
  .where("u.organizationId = :orgId", { orgId: organizationId })
  .getRawOne();
```

---

## Tier 7 — Startup / Cold Start

### 14. RBAC seed runs on every boot

**Location:** `main.ts:33-34`

```ts
const seeder = app.get(RbacSeeder);
await seeder.seed();
```

Queries all permissions + all roles on every startup. Adds ~200-500ms. In PM2 cluster mode (`instances: "max"`), it runs N times (once per worker).

**Fix:** Move RBAC seeding to a migration. Or guard with a single "already seeded" DB check.

### 15. Build uses `nest-tsc` (TypeScript compiler), no SWC

**Location:** `nest-cli.json:5`

```json
"builder": "nest-tsc"
```

`nest-tsc` is the full TypeScript compiler — type-checks AND compiles. `@swc` is 5-10x faster for compilation.

**Fix:** Switch to SWC in `nest-cli.json` or run `tsc --noEmit` in CI and `nest build --swc` in Docker.

---

## Tier 8 — Frontend

### 16. Next.js proxy rewrite adds latency to every API call

**Location:** `next.config.js:4-8`

```js
async rewrites() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
}
```

Every frontend API call goes: browser → Next.js (port 3000) → NestJS (port 3001) → DB. The Next.js server is a pure proxy hop — adds latency and consumes resources.

In `ecosystem.config.js`, web runs `instances: 1` (fork mode) — a single process proxying all requests.

**Fix:** In production, point frontend directly at the API host. Remove the rewrite. Or colocate API routes in Next.js.

### 17. No token refresh de-duplication (thundering herd)

**Location:** `api-client.ts:70-81`

If 10 requests fire simultaneously while the access token is expired, all 10 get 401 → all 10 fire parallel refresh requests.

**Fix:** Implement a refresh mutex (shared promise that resolves to a single refresh).

### 18. RequestLoggingInterceptor logs synchronously to stdout

**Location:** `request-logging.interceptor.ts:22`

```ts
this.logger.log(`${method} ${url} -> ${res.statusCode} (${latency}ms)`);
```

Sync stdout writes on every request. At high QPS, this can become a bottleneck.

**Fix:** Use async logging or a ring buffer. Disable per-request logging in production; rely on structured tracing.

---

## Tier 9 — Search

### 19. `searchVector` column never populated — ILIKE full scans

**Location:** `search-document.entity.ts:29`, `search.service.ts:38`

The migration creates a GIN index on `to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))`, but:
- `search.service.ts:38` uses `ILIKE` instead of `@@to_tsquery`
- `search.service.ts:22-28` (`index()` method) never sets `searchVector`

**Fix:** Use `@@to_tsquery` in the WHERE clause to leverage the GIN index, or populate `searchVector` on write.

---

## Tier 10 — Minor

### 20. `getSubscription` uses `find` (array) instead of `findOne`

**Location:** `billing.service.ts:23`

```ts
let sub = await this.subs.find({ where: { organizationId } });
```

Should be `findOne`. Signals a potential data integrity issue (multiple subscriptions per org).

### 21. No `OnModuleDestroy` — Redis/BullMQ connections leak on shutdown

Neither `RedisService`, `QueueRegistry`, nor any consumer implements `OnModuleDestroy`. In PM2 cluster mode, each worker process holds 2 Redis connections that are never closed.

### 22. `listPrompts` without org filter returns ALL prompts across all tenants

**Location:** `ai.service.ts:110-111`

```ts
return this.prompts.find({
  where: organizationId ? { organizationId } : {},  // ← empty where = ALL prompts
});
```

---

## Priority Summary

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| **Blocker** | `isSuperAdmin` missing → build fails | API won't start | 5 min |
| **P1** | Per-request DB permission resolution (2 queries, JWT ignored) | Every request, ~5-10ms × 2 | Medium |
| **P1** | bcryptjs on event loop (auth endpoints) | Login/register blocks all requests | Medium |
| **P1** | Synchronous file I/O (uploads) | Event loop blocked per file op | Low |
| **P1** | AI chat double execution + synchronous OpenAI call | 1-5s latency + 2x API cost | Medium |
| **P2** | Redundant `assertPermission` in services | 4 extra DB queries per dashboard | Low |
| **P2** | Eager loading on Role.permissions | Loads all perms on every Role query | Low |
| **P2** | Missing DB indexes (memberships, notifications, files) | Slow auth + notification queries | Low |
| **P2** | Duplicate Redis connection in QueueRegistry | Extra TCP connections | Low |
| **P2** | Audit logging blocks mutation requests | +1 DB round-trip per write | Medium |
| **P3** | No Redis-based response caching | Hot read endpoints recomputed | Medium |
| **P3** | Frontend double-hop via Next.js rewrite | +5-20ms per request | Low |
| **P3** | RBAC seed on every boot | +200-500ms startup | Low |
| **P3** | `listMembers` loads full User+Org entities | O(n) materialization | Medium |
| **P3** | `userAnalytics`/`aiSpend` load-then-count/reduce | O(n) vs O(1) | Low |
| **P3** | `nest-tsc` builder, no SWC | Slow builds | Low |
| **P3** | No refresh token de-duplication | Thundering herd on 401 | Low |
| **P3** | Search uses ILIKE instead of GIN tsvector | Full table scans | Low |
