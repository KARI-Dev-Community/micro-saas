# Multi-Tenancy Architecture

## Layers

1. **Organization** — top-level tenant. Every tenant-scoped row carries
   `organizationId`. Billing, memberships, projects, files, AI usage, audit logs
   all hang off it.
2. **Workspace** — belongs to an organization; groups projects/data.
3. **Team** — belongs to a workspace; groups members with shared access.
4. **Membership** — links `User ↔ Organization` (and optionally `Workspace`/`Team`)
   with a `role` and `status` (invited/active/suspended).

## Tenant isolation

- **Every query is scoped by `organizationId`** in the service layer. There is no
  shared/global data path — the `x-organization-id` header is required by
  `PermissionGuard` for any protected, scoped route.
- `RbacService` resolves permissions *within* an organization, so the same user
  can be an `owner` in one org and a `viewer` in another.
- Audit logs record `organizationId` so activity is traceable per tenant.

## Organization switching

The client stores the selected org id (Zustand `activeOrgId`) and sends it via the
`x-organization-id` header. The org switcher in the dashboard header calls
`setActiveOrg()`. The backend never trusts a client-supplied org for *data* access
beyond verifying the user is an `active` member.

## Invitations

`tenant.inviteMember` creates a `membership` with `status=invited` +
`invitationToken`, emails the invite, and `acceptInvitation` flips it to `active`
and binds the invited user's id.

## Membership & roles

`membership.role` references a `Role` (one of 6 system roles seeded by
`RbacSeeder`). Permissions are resolved via `role_permissions`. Custom per-org
roles can be added with `organizationId` set.

## Adding a tenant-scoped feature

1. Entity has `organizationId` column + index.
2. Service methods take `organizationId` and scope all queries.
3. Controller applies `@Permissions(...)` (PermissionGuard requires `x-organization-id`).
4. Frontend sends `organizationId` via `api` helper and gates UI with `<Can>`.
