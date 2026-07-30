# Database Schema / ERD

**Version:** 1.0 (Draft)
**Date Generated:** 2025-07-31
**Source:** `saas-starter-kit` repository — `apps/api/src/database/migrations/0000000000001-initial-schema.ts`
**Author:** Generated via reverse-engineering from codebase

---

## 1. OVERVIEW

The database schema is defined in a single TypeORM migration (`InitialSchema0000000000001`) targeting **PostgreSQL** (UUID primary keys). The schema contains **22 tables** with explicit foreign keys and indexes.

**Source:** `apps/api/src/database/migrations/0000000000001-initial-schema.ts:6-508`

**Extension:** `uuid-ossp` (PostgreSQL) for UUID generation.
**Note for MySQL:** Migration comments indicate swapping UUID defaults/timestamptz → datetime and replacing GIN full-text index with FULLTEXT.

---

## 2. TABLES

### 2.1 Authentication & Users

#### `users`
Global user accounts.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `email` | `varchar(255)` | **UNIQUE** | — |
| `passwordHash` | `varchar(255)` | NULLABLE | — |
| `status` | `varchar(32)` | — | `'pending'` |
| `provider` | `varchar(32)` | — | `'email'` |
| `providerId` | `varchar(255)` | NULLABLE | — |
| `emailVerified` | `boolean` | — | `false` |
| `emailVerificationToken` | `varchar(255)` | NULLABLE | — |
| `emailVerificationExpiresAt` | `timestamptz` | NULLABLE | — |
| `passwordResetToken` | `varchar(255)` | NULLABLE | — |
| `passwordResetExpiresAt` | `timestamptz` | NULLABLE | — |
| `twoFactorMethod` | `varchar(32)` | — | `'none'` |
| `twoFactorSecret` | `varchar(64)` | NULLABLE | — |
| `twoFactorEnabled` | `boolean` | — | `false` |
| `locale` | `varchar(16)` | — | `'en'` |
| `timezone` | `varchar(64)` | — | `'UTC'` |
| `currency` | `varchar(8)` | — | `'USD'` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Valid status values** (from `packages/shared/src/enums.ts:22-28`): `pending`, `active`, `suspended`, `deactivated`, `deleted`

**Valid provider values** (from `packages/shared/src/enums.ts:31-34`): `email`, `google`

**Valid 2FA method values** (from `packages/shared/src/enums.ts:37-41`): `none`, `totp`, `webauthn`

---

#### `user_profiles`
Per-user profile data (1:1 with `users`).

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `userId` | `uuid` | NOT NULL, **FK → users(id) ON DELETE CASCADE** | — |
| `firstName` | `varchar(120)` | NULLABLE | — |
| `lastName` | `varchar(120)` | NULLABLE | — |
| `avatarUrl` | `varchar(512)` | NULLABLE | — |
| `phone` | `varchar(64)` | NULLABLE | — |
| `preferences` | `jsonb` | — | `'{}'` |
| `notificationSettings` | `jsonb` | — | `'{}'` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_user_profiles_user` on (`userId`)

---

#### `sessions`
Refresh token sessions for revocation and audit.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `userId` | `uuid` | NOT NULL, **FK → users(id) ON DELETE CASCADE** | — |
| `tokenId` | `varchar(64)` | **UNIQUE** | — |
| `deviceName` | `varchar(255)` | NULLABLE | — |
| `deviceType` | `varchar(255)` | NULLABLE | — |
| `browser` | `varchar(255)` | NULLABLE | — |
| `os` | `varchar(64)` | NULLABLE | — |
| `ipAddress` | `varchar(45)` | NULLABLE | — |
| `userAgent` | `varchar(512)` | NULLABLE | — |
| `location` | `varchar(255)` | NULLABLE | — |
| `expiresAt` | `timestamptz` | NOT NULL | — |
| `lastActivityAt` | `timestamptz` | NULLABLE | — |
| `isActive` | `boolean` | — | `true` |
| `current` | `boolean` | — | `false` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_sessions_user` on (`userId`)

---

#### `passkeys`
WebAuthn credentials for passwordless login.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `userId` | `uuid` | NOT NULL, **FK → users(id) ON DELETE CASCADE** | — |
| `credentialId` | `varchar(255)` | NOT NULL | — |
| `publicKey` | `text` | NOT NULL | — |
| `deviceName` | `varchar(255)` | NULLABLE | — |
| `counter` | `integer` | NOT NULL | — |
| `transports` | `varchar(64)` | — | `'cross-platform'` |
| `lastUsedAt` | `timestamptz` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_passkeys_user` on (`userId`)

---

### 2.2 Multi-Tenant Core

#### `organizations`
Top-level tenants.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `slug` | `varchar(64)` | **UNIQUE** | — |
| `name` | `varchar(160)` | NOT NULL | — |
| `logoUrl` | `varchar(512)` | NULLABLE | — |
| `locale` | `varchar(64)` | — | `'en'` |
| `timezone` | `varchar(64)` | — | `'UTC'` |
| `currency` | `varchar(8)` | — | `'USD'` |
| `isActive` | `boolean` | — | `true` |
| `settings` | `jsonb` | — | `'{}'` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

---

#### `workspaces`
Org-level groupings.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `organizationId` | `uuid` | NOT NULL, **FK → organizations(id) ON DELETE CASCADE** | — |
| `name` | `varchar(64)` | NOT NULL | — |
| `slug` | `varchar(64)` | NULLABLE | — |
| `isActive` | `boolean` | — | `true` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_workspaces_org` on (`organizationId`)

---

#### `teams`
Workspace-level groupings.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `workspaceId` | `uuid` | NOT NULL, **FK → workspaces(id) ON DELETE CASCADE** | — |
| `organizationId` | `uuid` | NOT NULL | — |
| `name` | `varchar(120)` | NOT NULL | — |
| `description` | `text` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_teams_workspace` on (`workspaceId`)

**Note:** `organizationId` is stored redundantly on `teams` (also derivable via `workspace.organizationId`). This is a denormalization choice.

---

#### `memberships`
User ↔ Organization/Workspace/Team links with role.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `userId` | `uuid` | NOT NULL, **FK → users(id) ON DELETE CASCADE** | — |
| `organizationId` | `uuid` | NOT NULL, **FK → organizations(id) ON DELETE CASCADE** | — |
| `workspaceId` | `uuid` | NULLABLE | — |
| `teamId` | `uuid` | NULLABLE | — |
| `role` | `varchar(32)` | — | `'member'` |
| `status` | `varchar(32)` | — | `'invited'` |
| `invitationToken` | `varchar(255)` | NULLABLE | — |
| `invitationExpiresAt` | `timestamptz` | NULLABLE | — |
| `joinedAt` | `timestamptz` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Valid status values** (from `packages/shared/src/enums.ts:74-78`): `invited`, `active`, `suspended`

**Valid role values** (from `packages/shared/src/enums.ts:64-71`): `super_admin`, `org_owner`, `admin`, `manager`, `member`, `viewer`

**Indexes:** `idx_memberships_user` on (`userId`), `idx_memberships_org` on (`organizationId`)

**Note:** No explicit FK on `workspaceId` or `teamId` in the migration — they are nullable without FK constraints defined in the initial schema.

---

### 2.3 RBAC Tables

#### `roles`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `name` | `varchar(32)` | **UNIQUE** | — |
| `label` | `varchar(160)` | NOT NULL | — |
| `description` | `text` | NULLABLE | — |
| `isSystem` | `boolean` | — | `false` |
| `organizationId` | `uuid` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Note:** System roles have `organizationId = NULL`. Custom roles belong to an organization.

---

#### `permissions`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `key` | `varchar(64)` | **UNIQUE** | — |
| `label` | `varchar(160)` | NOT NULL | — |
| `group` | `varchar(64)` | — | `'General'` |
| `description` | `text` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Example keys** (from `packages/shared/src/enums.ts:83-140`): `platform.read`, `org.read`, `project.create`, `ai.chat`, `file.upload`, etc.

---

#### `role_permissions`
N:N join table.

| Column | Type | Constraints |
|--------|------|-------------|
| `roleId` | `uuid` | **PK+FK → roles(id) ON DELETE CASCADE** |
| `permissionId` | `uuid` | **PK+FK → permissions(id) ON DELETE CASCADE** |

**Composite PK:** (`roleId`, `permissionId`)

---

### 2.4 Billing Tables

#### `subscriptions`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `organizationId` | `uuid` | NOT NULL, **FK → organizations(id) ON DELETE CASCADE** | — |
| `plan` | `varchar(32)` | — | `'free'` |
| `status` | `varchar(32)` | — | `'active'` |
| `provider` | `varchar(64)` | NULLABLE | — |
| `providerSubscriptionId` | `varchar(255)` | NULLABLE | — |
| `providerCustomerId` | `varchar(255)` | NULLABLE | — |
| `couponCode` | `varchar(255)` | NULLABLE | — |
| `amountCents` | `integer` | NULLABLE | — |
| `currency` | `varchar(8)` | — | `'usd'` |
| `trialEndsAt` | `timestamptz` | NULLABLE | — |
| `currentPeriodStart` | `timestamptz` | NULLABLE | — |
| `currentPeriodEnd` | `timestamptz` | NULLABLE | — |
| `canceledAt` | `timestamptz` | NULLABLE | — |
| `cancelAtPeriodEnd` | `boolean` | — | `false` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Valid plan values** (from `packages/shared/src/enums.ts:4-9`): `free`, `trial`, `monthly`, `annual`

**Valid status values** (from `packages/shared/src/enums.ts:12-19`): `active`, `trialing`, `past_due`, `canceled`, `incomplete`, `unpaid`

**Indexes:** `idx_subscriptions_org` on (`organizationId`)

---

#### `invoices`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `organizationId` | `uuid` | NOT NULL | — |
| `number` | `varchar(64)` | NULLABLE | — |
| `providerInvoiceId` | `varchar(255)` | NULLABLE | — |
| `amountCents` | `integer` | NOT NULL | — |
| `currency` | `varchar(8)` | — | `'usd'` |
| `status` | `varchar(32)` | — | `'paid'` |
| `pdfUrl` | `varchar(255)` | NULLABLE | — |
| `paidAt` | `timestamptz` | NULLABLE | — |
| `metadata` | `jsonb` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_invoices_org` on (`organizationId`)

**Note:** No explicit FK constraint on `organizationId` in the migration (unlike `subscriptions`).

---

#### `coupons`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `code` | `varchar(64)` | **UNIQUE** | — |
| `type` | `varchar(32)` | — | `'percent'` |
| `value` | `integer` | NOT NULL | — |
| `currency` | `varchar(8)` | — | `'usd'` |
| `maxRedemptions` | `integer` | NULLABLE | — |
| `redemptions` | `integer` | — | `0` |
| `expiresAt` | `timestamptz` | NULLABLE | — |
| `isActive` | `boolean` | — | `true` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

---

### 2.5 Feature Domain Tables

#### `projects`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `organizationId` | `uuid` | NOT NULL, **FK → organizations(id) ON DELETE CASCADE** | — |
| `workspaceId` | `uuid` | NULLABLE | — |
| `name` | `varchar(160)` | NOT NULL | — |
| `description` | `text` | NULLABLE | — |
| `status` | `varchar(32)` | — | `'active'` |
| `ownerId` | `uuid` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_projects_org` on (`organizationId`)

---

#### `tasks`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `projectId` | `uuid` | NOT NULL, **FK → projects(id) ON DELETE CASCADE** | — |
| `organizationId` | `uuid` | NOT NULL | — |
| `title` | `varchar(200)` | NOT NULL | — |
| `description` | `text` | NULLABLE | — |
| `status` | `varchar(32)` | — | `'todo'` |
| `priority` | `varchar(32)` | — | `'medium'` |
| `assigneeId` | `uuid` | NULLABLE | — |
| `dueDate` | `timestamptz` | NULLABLE | — |
| `position` | `integer` | — | `0` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_tasks_project` on (`projectId`)

**Note:** `organizationId` is redundant on `tasks` (derivable from `project.organizationId`).

---

#### `task_comments`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `taskId` | `uuid` | NOT NULL, **FK → tasks(id) ON DELETE CASCADE** | — |
| `authorId` | `uuid` | NOT NULL | — |
| `content` | `text` | NOT NULL | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** None explicitly defined beyond FK.

---

#### `activities`
Activity timeline entries.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `organizationId` | `uuid` | NOT NULL | — |
| `projectId` | `uuid` | NULLABLE | — |
| `taskId` | `uuid` | NULLABLE | — |
| `actorId` | `uuid` | NOT NULL | — |
| `type` | `varchar(64)` | NOT NULL | — |
| `message` | `text` | NULLABLE | — |
| `metadata` | `jsonb` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_activities_org` on (`organizationId`)

---

### 2.6 AI Tables

#### `ai_conversations`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `userId` | `uuid` | NOT NULL, **FK → users(id) ON DELETE CASCADE** | — |
| `organizationId` | `uuid` | NULLABLE | — |
| `title` | `varchar(160)` | — | `'New conversation'` |
| `type` | `varchar(64)` | — | `'chat'` |
| `isActive` | `boolean` | — | `true` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_ai_conv_user` on (`userId`)

---

#### `ai_messages`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `conversationId` | `uuid` | NOT NULL, **FK → ai_conversations(id) ON DELETE CASCADE** | — |
| `role` | `varchar(16)` | NOT NULL | — |
| `content` | `text` | NOT NULL | — |
| `promptTokens` | `integer` | NULLABLE | — |
| `completionTokens` | `integer` | NULLABLE | — |
| `metadata` | `jsonb` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_ai_msg_conv` on (`conversationId`)

---

#### `ai_usage`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `organizationId` | `uuid` | NULLABLE | — |
| `userId` | `uuid` | NULLABLE | — |
| `date` | `date` | NOT NULL | — |
| `model` | `varchar(64)` | NOT NULL | — |
| `promptTokens` | `integer` | — | `0` |
| `completionTokens` | `integer` | — | `0` |
| `costUsd` | `decimal(12,6)` | — | `0` |
| `requestCount` | `integer` | — | `0` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_ai_usage_org` on (`organizationId`)

---

#### `ai_prompts`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `organizationId` | `uuid` | NULLABLE | — |
| `createdBy` | `uuid` | NULLABLE | — |
| `name` | `varchar(160)` | NOT NULL | — |
| `content` | `text` | NOT NULL | — |
| `category` | `varchar(64)` | — | `'general'` |
| `isSystem` | `boolean` | — | `false` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

---

### 2.7 Other Tables

#### `files`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `ownerId` | `uuid` | NULLABLE | — |
| `organizationId` | `uuid` | NULLABLE | — |
| `fileName` | `varchar(255)` | NOT NULL | — |
| `storedKey` | `varchar(255)` | NOT NULL | — |
| `mimeType` | `varchar(255)` | NOT NULL | — |
| `sizeBytes` | `bigint` | — | `0` |
| `visibility` | `varchar(32)` | — | `'private'` |
| `parentFileId` | `uuid` | NULLABLE | — |
| `version` | `integer` | — | `1` |
| `url` | `varchar(512)` | NULLABLE | — |
| `metadata` | `jsonb` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Valid visibility values** (from `packages/shared/src/enums.ts:58-61`): `public`, `private`

**Indexes:** `idx_files_owner` on (`ownerId`)

**Denormalization/Notes:** `parentFileId` enables versioning (file replacement). `organizationId` at the table level rather than a separate `file_versions` table.

---

#### `search_documents`
Full-text search index.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `tenantId` | `uuid` | NOT NULL | — |
| `entityType` | `varchar(64)` | NOT NULL | — |
| `entityId` | `uuid` | NOT NULL | — |
| `title` | `varchar(255)` | NOT NULL | — |
| `body` | `text` | NULLABLE | — |
| `module` | `varchar(64)` | — | `''` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:**
- `idx_search_tenant` on (`tenantId`)
- **GIN index:** `idx_search_documents_fts` on `to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))`

**Note:** Uses `tenantId` (not `organizationId`) as the tenant scoping field, which is inconsistent with all other tables.

---

#### `notifications`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `userId` | `uuid` | NOT NULL, **FK → users(id) ON DELETE CASCADE** | — |
| `organizationId` | `uuid` | NULLABLE | — |
| `channel` | `varchar(32)` | — | `'in_app'` |
| `status` | `varchar(32)` | — | `'unread'` |
| `title` | `varchar(160)` | NOT NULL | — |
| `body` | `text` | NULLABLE | — |
| `link` | `varchar(255)` | NULLABLE | — |
| `category` | `varchar(64)` | NULLABLE | — |
| `metadata` | `jsonb` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Valid channel values** (from `packages/shared/src/enums.ts:44-48`): `in_app`, `email`, `realtime`

**Valid status values** (from `packages/shared/src/enums.ts:50-55`): `unread`, `read`, `archived`

**Indexes:** `idx_notifications_user` on (`userId`)

---

#### `audit_logs`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `actorId` | `uuid` | NULLABLE | — |
| `organizationId` | `uuid` | NULLABLE | — |
| `module` | `varchar(64)` | NOT NULL | — |
| `action` | `varchar(64)` | NOT NULL | — |
| `entityType` | `varchar(64)` | NULLABLE | — |
| `entityId` | `uuid` | NULLABLE | — |
| `oldValue` | `jsonb` | NULLABLE | — |
| `newValue` | `jsonb` | NULLABLE | — |
| `ipAddress` | `varchar(45)` | NULLABLE | — |
| `userAgent` | `varchar(512)` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

**Indexes:** `idx_audit_actor` on (`actorId`), `idx_audit_module` on (`module`) |

---

#### `feature_flags`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `key` | `varchar(64)` | **UNIQUE** | — |
| `label` | `varchar(160)` | NOT NULL | — |
| `enabled` | `boolean` | — | `false` |
| `rules` | `jsonb` | NULLABLE | — |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

---

#### `system_settings`
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `uuid` | **PK** | `uuid_generate_v4()` |
| `key` | `varchar(64)` | **UNIQUE** | — |
| `value` | `text` | NOT NULL | — |
| `type` | `varchar(32)` | — | `'string'` |
| `createdAt` | `timestamptz` | — | `now()` |
| `updatedAt` | `timestamptz` | — | `now()` |

---

## 3. ENTITY-RELATIONSHIP SUMMARY

### 3.1 Cardinality Table

| Relationship | Type | Delete Behavior |
|--------------|------|-----------------|
| `users` → `user_profiles` | 1:1 | CASCADE |
| `users` → `sessions` | 1:N | CASCADE |
| `users` → `passkeys` | 1:N | CASCADE |
| `organizations` → `workspaces` | 1:N | CASCADE |
| `workspaces` → `teams` | 1:N | CASCADE |
| `users` ↔ `organizations` via `memberships` | N:M | CASCADE on both |
| `roles` ↔ `permissions` via `role_permissions` | N:M | CASCADE on both |
| `organizations` → `subscriptions` | 1:N | CASCADE |
| `projects` → `tasks` | 1:N | CASCADE |
| `tasks` → `task_comments` | 1:N | CASCADE |
| `ai_conversations` → `ai_messages` | 1:N | CASCADE |

---

## 4. INDEXES & CONSTRAINTS

### 4.1 Explicit Indexes (Defined in Migration)

| Index Name | Table | Column(s) | Type |
|------------|-------|------------|------|
| `idx_user_profiles_user` | `user_profiles` | `userId` | B-tree |
| `idx_sessions_user` | `sessions` | `userId` | B-tree |
| `idx_passkeys_user` | `passkeys` | `userId` | B-tree |
| `idx_workspaces_org` | `workspaces` | `organizationId` | B-tree |
| `idx_teams_workspace` | `teams` | `workspaceId` | B-tree |
| `idx_memberships_user` | `memberships` | `userId` | B-tree |
| `idx_memberships_org` | `memberships` | `organizationId` | B-tree |
| `idx_subscriptions_org` | `subscriptions` | `organizationId` | B-tree |
| `idx_invoices_org` | `invoices` | `organizationId` | B-tree |
| `idx_audit_actor` | `audit_logs` | `actorId` | B-tree |
| `idx_audit_module` | `audit_logs` | `module` | B-tree |
| `idx_notifications_user` | `notifications` | `userId` | B-tree |
| `idx_files_owner` | `files` | `ownerId` | B-tree |
| `idx_search_tenant` | `search_documents` | `tenantId` | B-tree |
| `idx_search_documents_fts` | `search_documents` | `to_tsvector('english', coalesce(title,'') \|\| ' ' \|\| coalesce(body,''))` | **GIN** |
| `idx_ai_conv_user` | `ai_conversations` | `userId` | B-tree |
| `idx_ai_msg_conv` | `ai_messages` | `conversationId` | B-tree |
| `idx_ai_usage_org` | `ai_usage` | `organizationId` | B-tree |
| `idx_projects_org` | `projects` | `organizationId` | B-tree |
| `idx_tasks_project` | `tasks` | `projectId` | B-tree |
| `idx_activities_org` | `activities` | `organizationId` | B-tree |

### 4.2 Unique Constraints

| Table | Column | Constraint |
|-------|--------|------------|
| `users` | `email` | UNIQUE |
| `organizations` | `slug` | UNIQUE |
| `sessions` | `tokenId` | UNIQUE |
| `roles` | `name` | UNIQUE |
| `permissions` | `key` | UNIQUE |
| `role_permissions` | (`roleId`, `permissionId`) | Composite PK |
| `coupons` | `code` | UNIQUE |
| `feature_flags` | `key` | UNIQUE |
| `system_settings` | `key` | UNIQUE |

---

## 5. DESIGN OBSERVATIONS & FLAGS

### 5.1 Denormalization / Redundant Columns

- **`teams.organizationId`** — redundant because `teams` belong to `workspaces`, and `workspaces` belong to `organizations`. Stored for query convenience.
- **`tasks.organizationId`** — redundant because `tasks` belong to `projects`, and `projects` belong to `organizations`. Stored for query convenience.
- **[NEEDS CONFIRMATION]** Whether the application layer enforces consistency between `teams.workspaceId` → `workspace.organizationId` and `teams.organizationId`, or if there is risk of drift.

### 5.2 Missing FK Constraints

- `invoices.organizationId` has no FK constraint defined in the migration (unlike `subscriptions`).
- `memberships.workspaceId` and `memberships.teamId` are nullable and have no FK constraints in the migration.
- `activities.actorId` has no FK constraint to `users`.
- `files.ownerId` has no FK constraint.
- `task_comments.authorId` has no FK constraint.
- `ai_usage.userId` and `ai_usage.organizationId` have no FK constraints.
- `ai_prompts.createdBy` has no FK constraint.

**[NEEDS CONFIRMATION]** Whether FK constraints are intentionally omitted for soft-delete support, or whether they are enforced at the application layer only.

### 5.3 Naming Inconsistency

- **`search_documents`** uses `tenantId` as the tenant scoping field.
- **All other tables** use `organizationId` for tenant scoping.

### 5.4 Data Types

- All primary keys are `uuid` with `uuid_generate_v4()` default (PostgreSQL-specific).
- Timestamps use `timestamptz` (PostgreSQL). MySQL migration notes indicate swapping to `datetime`.
- `costUsd` in `ai_usage` uses `decimal(12,6)` for precision up to 6 decimal places.
