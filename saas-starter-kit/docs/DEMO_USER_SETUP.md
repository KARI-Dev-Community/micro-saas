# Demo User Setup — Super Admin

## What Was Changed

### 1. `apps/api/src/seed_demo_user.ts` — Rewritten to remove-then-reinsert

The seed script was changed from an `upsert`-based approach to an explicit **remove-then-reinsert** flow:

**Before:**
- Used `userRepo.upsert()` to create or update the demo user in-place
- Only created a membership if one didn't already exist (no role update)
- If the user already existed with a different role, the role was never changed

**After:**
1. Looks up the existing demo user by email
2. If found, **deletes all memberships** for that user, then **deletes the user**
3. Re-creates the user with `status: ACTIVE`
4. Creates a fresh membership with `role: SUPER_ADMIN` and `status: ACTIVE`

This guarantees the demo user is always a clean super admin with full permissions.

### 2. `apps/api/package.json` — Added `seed:demo` script

Added a convenience script to run the seeder without manually invoking `ts-node`:

```json
"seed:demo": "ts-node -r tsconfig-paths/register src/seed_demo_user.ts"
```

Run with:
```bash
npm run seed:demo --workspace apps/api
```

## How Super Admin Sees All Features and Sidebar

The super admin visibility works through three layers:

### Backend: Permission Resolution (`apps/api/src/tenant/rbac.service.ts`)

- `RbacService.resolveForRole("super_admin")` returns **all** permissions from the `Permission` enum (`Object.values(Permission)`)
- `RbacService.assertPermission()` and `RbacService.assertAny()` **skip all checks** when the role is `super_admin` (lines 53, 65)
- The `/api/auth/me` endpoint returns the full permission set to the frontend

### Frontend: Sidebar Gating (`apps/web/src/app/dashboard/layout.tsx`)

- The `NAV` array defines sidebar items, each with an optional `perm` property
- Items with `perm` are wrapped in `<Can permission={item.perm}>` which checks `useAuthStore.getState().permissions`
- Since super_admin has **all** permissions, every sidebar item renders

### Frontend: Feature Gating (`apps/web/src/lib/rbac.tsx`)

- The `<Can>` component and `hasPermission()` function check the stored permissions array
- Super admin's permissions array contains every `Permission` enum value
- Therefore `<Can permission={Permission.ANYTHING}>` always renders for super admin

## Usage

```bash
# 1. Ensure the database is running
npm run docker:up

# 2. Run migrations
npm run migrate --workspace apps/api

# 3. Seed the demo super admin user
npm run seed:demo --workspace apps/api

# 4. Start the API
npm run dev:api
```

The demo user credentials:
- **Email:** demo.saas@kari.com
- **Password:** demo123
- **Role:** super_admin (sees all features, sidebar items, and bypasses all RBAC checks)

## Why This Matters

The previous `upsert` approach had a subtle bug: if the demo user was already in the database with a non-super-admin role (e.g., from an earlier seed or manual change), the script would not update the role. The remove-then-reinsert approach guarantees idempotent, correct behavior every time.