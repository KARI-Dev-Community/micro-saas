# RBAC Service Test Coverage Document

## Overview

This document summarizes the test coverage for `RbacService` (`apps/api/src/tenant/rbac.service.ts`). The service handles role-based access control for multi-tenant organizations by resolving user permissions from their membership role and providing assertion methods for authorization checks.

**Test file:** `apps/api/src/tenant/rbac.service.spec.ts`
**Framework:** Jest + `@nestjs/testing`
**Mocking strategy:** Mock TypeORM repositories (`@nestjs/typeorm` / `Repository<Membership>` and `Repository<Role>`)

---

## Coverage Table

| Test Case ID | Scenario Description | Input / Conditions | Expected Result | Category |
|---|---|---|---|---|
| TC-001 | Returns role and permissions for valid active membership | `userId` + `organizationId` with ACTIVE membership and ORG_OWNER role | `{ role: "org_owner", permissions: [...] }` containing expected permission keys | Happy Path |
| TC-002 | Throws NotFoundException when no membership record exists | `userId` + `organizationId` where no membership row matches | Throws `NotFoundException("Membership not found for this organization")` | Negative |
| TC-003 | Throws NotFoundException when membership status is INVITED | Membership found but `status === MembershipStatus.INVITED` | Throws `NotFoundException` | Edge Case |
| TC-004 | Throws NotFoundException when membership status is SUSPENDED | Membership found but `status === MembershipStatus.SUSPENDED` | Throws `NotFoundException` | Edge Case |
| TC-005 | Returns all DB-stored permissions for SUPER_ADMIN role | `role = "super_admin"`, DB returns role entity with permission list | `{ role: "super_admin", permissions: [all DB keys] }` | Happy Path |
| TC-006 | Falls back to all `Permission` enum values when SUPER_ADMIN has no DB permissions | `role = "super_admin"`, DB returns empty result | `{ role: "super_admin", permissions: Object.values(Permission) }` | Happy Path |
| TC-007 | Returns ORG_OWNER role-specific permissions from DB | `role = "org_owner"`, DB returns role with permission list | `{ role: "org_owner", permissions: [...] }` matching DB entries | Happy Path |
| TC-008 | Returns VIEWER role-specific permissions from DB | `role = "viewer"`, DB returns role with permission list | `{ role: "viewer", permissions: [...] }` matching DB entries | Happy Path |
| TC-009 | Returns empty permissions array when role is not found in DB | `role = "member"`, DB returns no matching role entity | `{ role: "member", permissions: [] }` | Edge Case |
| TC-010 | Trims whitespace and lowercases role name before DB lookup | Input role string `"  VIEWER  "` | Resolves to `RoleName.VIEWER` and returns expected permissions | Edge Case |
| TC-011 | Treats null role input as empty string and returns empty permissions | `role = null` | `{ role: "", permissions: [] }` | Edge Case |
| TC-012 | Resolves without error when user has the required permission | `assertPermission(userId, orgId, "project.read")` with MEMBER that has this permission | No exception thrown | Happy Path |
| TC-013 | Skips permission check entirely for SUPER_ADMIN | `assertPermission(userId, orgId, "platform.manage")` with SUPER_ADMIN role | No exception thrown (bypasses permission lookup) | Happy Path |
| TC-014 | Throws ForbiddenException when user lacks the required permission | MEMBER with only `org.read` tries to assert `project.delete` | Throws `ForbiddenException("Missing permission: project.delete")` | Negative |
| TC-015 | Propagates NotFoundException from getUserPermissions when membership missing | `assertPermission` called for non-existent user/org | Throws `NotFoundException` | Integration |
| TC-016 | Resolves without error when user has at least one of multiple required permissions | `assertAny(userId, orgId, ["project.delete", "project.create"])` with MEMBER that has `project.create` | No exception thrown | Happy Path |
| TC-017 | Skips permission check for SUPER_ADMIN in assertAny | `assertAny(userId, orgId, ["platform.manage"])` with SUPER_ADMIN | No exception thrown (bypasses lookup) | Happy Path |
| TC-018 | Throws ForbiddenException when user has none of the required permissions | `assertAny(userId, orgId, ["project.delete", "project.create"])` with VIEWER that only has `org.read` | Throws `ForbiddenException("Requires one of: project.delete, project.create")` | Negative |
| TC-019 | Throws ForbiddenException when required array is empty | `assertAny(userId, orgId, [])` | Throws `ForbiddenException("Requires one of: ")` | Edge Case |
| TC-020 | Propagates NotFoundException when membership missing in assertAny | `assertAny` called for non-existent user/org | Throws `NotFoundException` | Integration |

---

## Coverage Summary

| Category | Count | Methods Covered |
|---|---|---|
| Happy Path | 9 | `getUserPermissions`, `resolveForRole`, `assertPermission`, `assertAny` |
| Edge Cases | 5 | `getUserPermissions` (status), `resolveForRole` (null/whitespace/fallback) |
| Negative / Error | 4 | `assertPermission` (forbidden, not found), `assertAny` (forbidden, empty array) |
| Integration (propagation) | 2 | `assertPermission` and `assertAny` propagating `NotFoundException` |
| **Total** | **20** | All 4 public methods covered |

---

## Mocking Strategy

All TypeORM `Repository` dependencies are mocked using `jest.fn()` with the following behavior:

- **`Membership` repository** (`getRepositoryToken(Membership)`): Mocked `findOne` returns configurable membership objects or `null`.
- **`Role` repository** (`getRepositoryToken(Role)`): Mocked `findOne` returns a single role entity; mocked `find` returns arrays (used for SUPER_ADMIN lookup).
- Mocks are reset and restored between tests via `clearMocks: true` and `restoreMocks: true` in the jest config.

---

## Setup / Teardown

- **`beforeEach`**: Creates a fresh `TestingModule` via `Test.createTestingModule()` with mocked repositories, compiles the module, and retrieves the `RbacService` instance. This ensures full isolation between tests.
- **No `afterEach` needed**: Jest's `clearMocks: true` and `restoreMocks: true` configuration handles mock reset automatically.

---

## Known Gaps / Future Improvements

1. **Custom per-org roles**: `resolveForRole` does not distinguish platform-wide (`organizationId = null`) vs. org-scoped roles. Tests cover system roles only.
2. **Concurrent access**: No concurrency/race-condition tests are included (no shared mutable state in the service).
3. **Performance benchmarks**: The service performs 1-2 DB queries per call. Load testing is out of scope for unit testing.
4. **Integration with PermissionGuard**: The integration between `assertPermission`/`assertAny` and NestJS `@Permissions()` decorator is tested at the unit level but not in an end-to-end module test.