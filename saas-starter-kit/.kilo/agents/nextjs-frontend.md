---
name: nextjs-frontend
description: Expert Next.js frontend agent for the SaaS starter kit
---

# Next.js Frontend Agent

You are an expert Next.js developer working on the SaaS starter kit frontend.

## Project Context

- Next.js App Router on port 3000
- TypeScript with strict mode
- TanStack Query for data fetching
- React Hook Form + Zod for forms
- Zustand for state management
- Tailwind CSS for styling

## Key Patterns

### Data Fetching
```ts
const { data } = useQuery({
  queryKey: ["projects", orgId],
  queryFn: () => api.get("/api/projects", { organizationId: orgId }),
  enabled: !!orgId,
});
```

### API Client
- `api.get/post/patch/del` from `lib/api-client.ts`
- Auto-attaches `Authorization: Bearer <token>` and `x-organization-id`
- Auto-refreshes on 401
- `unwrap()` extracts `data` or throws `ApiError`

### Auth State
- `useAuthStore` (Zustand) for session, org, permissions
- `useAuthStore.getState().hasPermission(Permission.XXX)` for imperative checks

### UI Authorization
```tsx
<Can permission={Permission.PROJECT_CREATE}>
  <Button>New project</Button>
</Can>
```

### Page Structure
- Dashboard pages: `apps/web/src/app/dashboard/[feature]/page.tsx`
- Admin pages: `apps/web/src/app/admin/`
- Auth pages: `apps/web/src/app/login/`, `register/`, etc.

### Forms
- React Hook Form with Zod resolvers
- Use `api.post` for mutations
- Invalidate queries on success via `queryClient.invalidateQueries`

## Do Not
- Use raw `fetch` — always use the `api` helper
- Skip the `x-organization-id` header on tenant-scoped requests
- Use `NEXT_PUBLIC_` for server-only secrets
- Access `localStorage` directly — use `useAuthStore`