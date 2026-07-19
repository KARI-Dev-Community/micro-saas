# Reusable Code Patterns

Copy these patterns to extend the kit for any SaaS product.

## 1. New RBAC-protected endpoint
```ts
@Post("widgets")
@Permissions(Permission.PROJECT_CREATE) // or your new perm
async create(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() dto: CreateDto) {
  return this.service.create({ organizationId: orgId!, userId: user.sub, ...dto });
}
```
- Add the permission to `Permission` enum in `packages/shared/src/enums.ts`.
- Grant it in `ROLE_PERMISSIONS` for the relevant roles.
- Guard requires `x-organization-id`; frontend sends it via `api.post(path, body, { organizationId })`.

## 2. New TypeORM entity + migration
```ts
@Entity("widgets")
export class Widget extends BaseEntity {
  @Index() @Column({ type: "uuid" }) organizationId!: string;
  @Column({ type: "varchar", length: 160 }) name!: string;
}
```
Generate the migration: `npm run migration:generate --workspace apps/api -- name=AddWidgets`
(uses `src/config/typeorm-cli.ts`). Migrations run on boot via docker-compose.

## 3. Standard response + pagination
```ts
const p = parsePagination(query);
const [items, total] = await repo.findAndCount({ skip: p.skip, take: p.limit });
return ok(toPaginated(items, total, p), "Listed"); // from @shared/response
```
The `ResponseInterceptor` wraps any return value in `{ success, message, data, meta }`.

## 4. Background job (BullMQ)
```ts
// enqueue
await this.queues.add(QUEUE_NAMES.EMAIL, "send", payload, { attempts: 3 });
// consume
@Processor("email") class EmailConsumer extends WorkerHost {
  async process(job: Job) { /* deliver */ }
}
```
Register the queue in `workers/worker.module.ts`.

## 5. Audit logging
```ts
await this.audit.record("project", "created", { actorId: user.sub, organizationId }, {
  entityType: "project", entityId: project.id, oldValue, newValue,
});
```
`AuditService` is global — inject it anywhere.

## 6. Frontend data fetching
```ts
const { data } = useQuery({
  queryKey: ["projects", orgId],
  queryFn: () => api.get("/api/projects", { organizationId: orgId, params: { limit: 50 } }),
  enabled: !!orgId,
});
```
`api` auto-attaches the Bearer token, `x-organization-id`, and refreshes on 401.

## 7. UI authorization
```tsx
<Can permission={Permission.PROJECT_CREATE}>
  <Button>New project</Button>
</Can>
```
or imperatively: `useAuthStore.getState().hasPermission(Permission.PROJECT_CREATE)`.

## 8. Standard envelope contract
Always return `{ success, message, data, meta }` (see `@shared/response`). Both
backend `ok()`/`fail()` and the frontend `api-client.unwrap()` rely on it.
