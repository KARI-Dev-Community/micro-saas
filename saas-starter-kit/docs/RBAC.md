# RBAC Permission Matrix

Roles are resolved at runtime from `membership.role` → `role.permissions`. `super_admin`
bypasses all guards (defined in `RbacSeeder` + `ROLE_PERMISSIONS` in `packages/shared`).

| Permission | super_admin | org_owner | admin | manager | member | viewer |
|-----------|:--:|:--:|:--:|:--:|:--:|:--:|
| platform.read | ✅ | | | | | |
| platform.manage | ✅ | | | | | |
| platform.users.manage | ✅ | | | | | |
| platform.orgs.manage | ✅ | | | | | |
| platform.billing.manage | ✅ | | | | | |
| platform.feature_flags | ✅ | | | | | |
| org.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| org.update | ✅ | ✅ | ✅ | | | |
| org.delete | ✅ | ✅ | | | | |
| org.members.invite | ✅ | ✅ | ✅ | ✅ | | |
| org.members.remove | ✅ | ✅ | ✅ | | | |
| org.members.role | ✅ | ✅ | ✅ | | | |
| org.billing.read | ✅ | ✅ | ✅ | | | |
| org.billing.manage | ✅ | ✅ | ✅ | | | |
| org.settings.manage | ✅ | ✅ | ✅ | | | |
| user.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| user.update | ✅ | ✅ | ✅ | ✅ | ✅ | |
| user.delete | ✅ | ✅ | | | | |
| project.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| project.create | ✅ | ✅ | ✅ | ✅ | ✅ | |
| project.update | ✅ | ✅ | ✅ | ✅ | ✅ | |
| project.delete | ✅ | ✅ | ✅ | ✅ | | |
| project.task.* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅(read) |
| ai.chat | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ai.assistant | ✅ | ✅ | ✅ | ✅ | ✅ | |
| ai.prompt.manage | ✅ | ✅ | ✅ | | | |
| ai.usage.read | ✅ | ✅ | ✅ | | | |
| file.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| file.upload | ✅ | ✅ | ✅ | ✅ | ✅ | |
| file.delete | ✅ | ✅ | ✅ | | | |
| audit.read | ✅ | ✅ | ✅ | | | |
| notification.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| notification.manage | ✅ | ✅ | ✅ | | | |
| dashboard.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| analytics.revenue.read | ✅ | ✅ | ✅ | | | |
| analytics.user.read | ✅ | ✅ | ✅ | ✅ | | |

## How it works

- Backend: `@Permissions(...)` + `PermissionGuard` (per route) resolves
  `RbacService.getUserPermissions(userId, organizationId)`.
- Frontend: `<Can permission="...">` component and `useAuthStore.hasPermission()` hide UI.
- Add a permission: add to `Permission` enum in `packages/shared`, grant it in
  `ROLE_PERMISSIONS`, and protect the route with `@Permissions(...)`.
