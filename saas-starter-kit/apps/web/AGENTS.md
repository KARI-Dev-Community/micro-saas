# Web App — AI Context

Next.js App Router frontend for the SaaS starter kit.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with Providers wrapper |
| `src/components/providers.tsx` | TanStack Query client setup |
| `src/lib/api-client.ts` | Centralized fetch with auto-refresh, Bearer token, `x-organization-id` |
| `src/lib/auth-store.ts` | Zustand persisted state for session, org, permissions |
| `src/lib/rbac.tsx` | `<Can>` component and `useAuthStore.hasPermission()` |

## Patterns

### Data Fetching
```ts
const { data } = useQuery({
  queryKey: ["projects", orgId],
  queryFn: () => api.get("/api/projects", { organizationId: orgId }),
  enabled: !!orgId,
});
```

### Forms
- React Hook Form + Zod resolvers
- Use `api.post` for mutations, invalidate queries on success

### UI Authorization
```tsx
<Can permission={Permission.PROJECT_CREATE}>
  <Button>New project</Button>
</Can>
```

### Pages
- Dashboard pages: `apps/web/src/app/dashboard/[feature]/page.tsx`
- Admin pages: `apps/web/src/app/admin/`
- Auth pages: `apps/web/src/app/login/`, `register/`, etc.

### API Client
- `api.get/post/patch/del` auto-attaches `Authorization: Bearer <token>` and `x-organization-id`
- Auto-refreshes on 401
- `unwrap()` extracts `data` or throws `ApiError`

## Do Not
- Use `NEXT_PUBLIC_` for server-only secrets
- Skip the `x-organization-id` header on tenant-scoped requests
- Use raw `fetch` — always use the `api` helper from `lib/api-client.ts`