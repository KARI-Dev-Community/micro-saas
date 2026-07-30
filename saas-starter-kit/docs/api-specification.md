# API Specification

**Version:** 1.0 (Draft)
**Date Generated:** 2025-07-31
**Source:** `saas-starter-kit` repository — all controller files under `apps/api/src/**/*.controller.ts`
**Author:** Generated via reverse-engineering from codebase

---

## 1. GENERAL CONVENTIONS

| Convention | Value |
|------------|-------|
| **Base URL** | `http://localhost:3001` (dev) — production behind Nginx |
| **Global Prefix** | `/api` (set via `process.env.API_PREFIX`, default `api`) |
| **Authentication** | JWT Bearer token in `Authorization` header |
| **Tenant Header** | `x-organization-id` for tenant-scoped routes |
| **Response Envelope** | `{ success: boolean, message: string, data: T | null, meta?: ApiMeta | null }` |
| **Error Envelope** | `{ success: false, message: string, data: { code?: string } | null, meta: null }` |
| **Rate Limit** | 120 requests per 60 seconds globally |
| **Validation** | `class-validator` with `ValidationPipe` (whitelist: true, transform: true) |

**Source:** `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/core/response/response.interceptor.ts`, `apps/api/src/core/exception/exception.filter.ts`

---

## 2. AUTH MODULE (`api/auth`)

### 2.1 Register
- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Auth:** Public
- **Request Body:** `RegisterDto` — `email` (string, required), `password` (string, required)
- **Response:** `{ user: { id: string, email: string, status: UserStatus } }`
- **Errors:** `400` (Invalid input), `409` (Email taken — inferred from BusinessException pattern)

**Source:** `apps/api/src/auth/auth.controller.ts:42-47`

### 2.2 Login
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Auth:** Public
- **Request Body:** `LoginDto` — `email` (string, required), `password` (string, required)
- **Response (Success):** `{ accessToken, refreshToken, expiresIn }`
- **Response (2FA Required):** `{ twoFactorRequired: true, userId: string }`
- **Errors:** `400` (Invalid credentials), `401` (2FA required — business response)

**Source:** `apps/api/src/auth/auth.controller.ts:49-62`

### 2.3 Refresh Token
- **Method:** `POST`
- **Path:** `/api/auth/refresh`
- **Auth:** None
- **Request Body:** `RefreshDto` — `refreshToken` (string, required)
- **Response:** `{ accessToken, refreshToken, expiresIn }`
- **Errors:** `401` (Invalid/expired refresh token)

**Source:** `apps/api/src/auth/auth.controller.ts:64-68`

### 2.4 Logout
- **Method:** `POST`
- **Path:** `/api/auth/logout`
- **Auth:** None
- **Request Body:** `RefreshDto` — `refreshToken` (string, required)
- **Response:** `{ loggedOut: true }`
- **Errors:** `401` (Invalid token)

**Source:** `apps/api/src/auth/auth.controller.ts:70-75`

### 2.5 Logout All Sessions
- **Method:** `POST`
- **Path:** `/api/auth/logout-all`
- **Auth:** JWT required
- **Response:** `{ loggedOut: true }`
- **Errors:** `401`

**Source:** `apps/api/src/auth/auth.controller.ts:77-81`

### 2.6 Verify Email
- **Method:** `GET`
- **Path:** `/api/auth/verify-email`
- **Auth:** Public
- **Query Param:** `token` (string, required)
- **Response:** HTTP 302 redirect to `{FRONTEND_URL}/login?verified=1`

**Source:** `apps/api/src/auth/auth.controller.ts:83-88`

### 2.7 Forgot Password
- **Method:** `POST`
- **Path:** `/api/auth/forgot-password`
- **Auth:** Public
- **Request Body:** `ForgotPasswordDto` — `email` (string, required)
- **Response:** `{ message: "If the email exists, a reset link was sent." }`

**Source:** `apps/api/src/auth/auth.controller.ts:90-96`

### 2.8 Reset Password
- **Method:** `POST`
- **Path:** `/api/auth/reset-password`
- **Auth:** Public
- **Request Body:** `ResetPasswordDto` — `token` (string, required), `password` (string, required)
- **Response:** `{ message: "Password updated" }`
- **Errors:** `400` (Invalid/expired token)

**Source:** `apps/api/src/auth/auth.controller.ts:98-104`

### 2.9 Change Password
- **Method:** `POST`
- **Path:** `/api/auth/change-password`
- **Auth:** JWT required
- **Request Body:** `ChangePasswordDto` — `current` (string, required), `next` (string, required)
- **Response:** `{ message: "Password changed" }`
- **Errors:** `400` (Invalid current password), `401`

**Source:** `apps/api/src/auth/auth.controller.ts:106-110`

### 2.10 Get Current User (`me`)
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Auth:** JWT required
- **Headers:** `x-organization-id` (optional but resolves permissions if present)
- **Response:** `{ id: string, email: string, organizationId: string | null, permissions: Permission[] }`
- **Errors:** `401`

**Source:** `apps/api/src/auth/auth.controller.ts:112-128`

### 2.11 Enable 2FA (TOTP)
- **Method:** `POST`
- **Path:** `/api/auth/security/2fa/enable`
- **Auth:** JWT required
- **Response:** TOTP setup data
- **Errors:** `401`

**Source:** `apps/api/src/auth/security.controller.ts:43-46`

### 2.12 Confirm 2FA
- **Method:** `POST`
- **Path:** `/api/auth/security/2fa/confirm`
- **Auth:** JWT required
- **Request Body:** `TotpConfirmDto` — `code` (string, required)
- **Response:** `{ enabled: true }`
- **Errors:** `400`, `401`

**Source:** `apps/api/src/auth/security.controller.ts:48-53`

### 2.13 Disable 2FA
- **Method:** `POST`
- **Path:** `/api/auth/security/2fa/disable`
- **Auth:** JWT required
- **Response:** `{ disabled: true }`
- **Errors:** `400`, `401`

**Source:** `apps/api/src/auth/security.controller.ts:55-60`

### 2.14 List Sessions
- **Method:** `GET`
- **Path:** `/api/auth/security/sessions`
- **Auth:** JWT required
- **Response:** Array of session objects: `id`, `deviceName`, `deviceType`, `browser`, `os`, `ipAddress`, `location`, `current`, `createdAt`, `expiresAt`
- **Errors:** `401`

**Source:** `apps/api/src/auth/security.controller.ts:62-80`

### 2.15 Revoke Session
- **Method:** `DELETE`
- **Path:** `/api/auth/security/sessions/:id`
- **Auth:** JWT required
- **Response:** `{ revoked: true }`
- **Errors:** `401`, `403`, `404`

**Source:** `apps/api/src/auth/security.controller.ts:82-87`

### 2.16 Revoke Other Sessions
- **Method:** `DELETE`
- **Path:** `/api/auth/security/sessions`
- **Auth:** JWT required
- **Response:** `{ revoked: true }`
- **Errors:** `401`

**Source:** `apps/api/src/auth/security.controller.ts:89-96`

### 2.17 List Passkeys
- **Method:** `GET`
- **Path:** `/api/auth/security/passkeys`
- **Auth:** JWT required
- **Response:** Array of `{ id, deviceName, createdAt, lastUsedAt }`
- **Errors:** `401`

**Source:** `apps/api/src/auth/security.controller.ts:98-102`

### 2.18 Add Passkey
- **Method:** `POST`
- **Path:** `/api/auth/security/passkeys`
- **Auth:** JWT required
- **Request Body:** `PasskeyRegisterDto` — `credentialId` (string, required), `publicKey` (string, required), `deviceName` (string, optional), `transports` (string, optional), `counter` (number, required)
- **Response:** `{ id: string }`
- **Errors:** `400`, `401`

**Source:** `apps/api/src/auth/security.controller.ts:104-115`

### 2.19 Remove Passkey
- **Method:** `DELETE`
- **Path:** `/api/auth/security/passkeys/:id`
- **Auth:** JWT required
- **Response:** `{ removed: true }`
- **Errors:** `401`, `404`

**Source:** `apps/api/src/auth/security.controller.ts:117-122`

### 2.20 Google OAuth Redirect
- **Method:** `GET`
- **Path:** `/api/auth/google/login`
- **Auth:** Public
- **Response:** HTTP 302 redirect to Google OAuth consent screen
- **Errors:** `500` if `GOOGLE_CLIENT_ID` is unconfigured

**Source:** `apps/api/src/auth/google.controller.ts:24-34`

### 2.21 Google OAuth Callback
- **Method:** `GET`
- **Path:** `/api/auth/google/callback`
- **Auth:** Public
- **Query Param:** `code` (string, required)
- **Response:** HTTP 302 redirect to `{FRONTEND_URL}/oauth/callback?access=<token>&refresh=<token>`
- **Errors:** `500` if token exchange fails

**Source:** `apps/api/src/auth/google.controller.ts:36-55`

---

## 3. TENANT / ORGANIZATION MODULE (`api/organizations`)

### 3.1 List My Organizations
- **Method:** `GET`
- **Path:** `/api/organizations/mine`
- **Auth:** JWT required
- **Response:** Array of organization objects
- **Errors:** `401`

**Source:** `apps/api/src/tenant/tenant.controller.ts:46-49`

### 3.2 Create Organization
- **Method:** `POST`
- **Path:** `/api/organizations`
- **Auth:** JWT required
- **Request Body:** `{ name: string (required), slug?: string }`
- **Response:** Organization object
- **Errors:** `400`, `409` (slug conflict), `401`

**Source:** `apps/api/src/tenant/tenant.controller.ts:51-54`

### 3.3 Get Organization
- **Method:** `GET`
- **Path:** `/api/organizations/:id`
- **Auth:** JWT + Permission(`org.read`) + Tenant context
- **Response:** Organization object
- **Errors:** `401`, `403`, `404`

**Source:** `apps/api/src/tenant/tenant.controller.ts:56-60`

### 3.4 Update Organization
- **Method:** `PATCH`
- **Path:** `/api/organizations/:id`
- **Auth:** JWT + Permission(`org.update`) + Tenant context
- **Request Body:** `any` (untyped)
- **Response:** Updated organization object
- **Errors:** `401`, `403`, `404`

**Source:** `apps/api/src/tenant/tenant.controller.ts:62-66`

### 3.5 List Members
- **Method:** `GET`
- **Path:** `/api/organizations/:id/members`
- **Auth:** JWT + Permission(`org.read`) + Tenant context
- **Response:** Array of membership/user objects
- **Errors:** `401`, `403`, `404`

**Source:** `apps/api/src/tenant/tenant.controller.ts:68-72`

### 3.6 Invite Member
- **Method:** `POST`
- **Path:** `/api/organizations/:id/members/invite`
- **Auth:** JWT + Permission(`org.members.invite`) + Tenant context
- **Request Body:** `{ email: string (required, email format), role: RoleName (required) }`
- **Response:** Membership invitation object
- **Errors:** `400`, `403`, `409` (already member)

**Source:** `apps/api/src/tenant/tenant.controller.ts:74-78`

### 3.7 Change Member Role
- **Method:** `POST`
- **Path:** `/api/organizations/:id/members/:mid/role`
- **Auth:** JWT + Permission(`org.members.role`) + Tenant context
- **Request Body:** `{ role: RoleName (required) }`
- **Response:** `{ updated: true }`
- **Errors:** `400`, `403`, `404`

**Source:** `apps/api/src/tenant/tenant.controller.ts:80-85`

### 3.8 Remove Member
- **Method:** `DELETE`
- **Path:** `/api/organizations/:id/members/:mid`
- **Auth:** JWT + Permission(`org.members.remove`) + Tenant context
- **Response:** `{ removed: true }`
- **Errors:** `403`, `404`

**Source:** `apps/api/src/tenant/tenant.controller.ts:87-92`

### 3.9 List Workspaces
- **Method:** `GET`
- **Path:** `/api/organizations/:id/workspaces`
- **Auth:** JWT + Permission(`org.read`) + Tenant context
- **Response:** Array of workspace objects
- **Errors:** `401`, `403`, `404`

**Source:** `apps/api/src/tenant/tenant.controller.ts:94-98`

### 3.10 Create Workspace
- **Method:** `POST`
- **Path:** `/api/organizations/:id/workspaces`
- **Auth:** JWT + Permission(`org.update`) + Tenant context
- **Request Body:** `{ name: string (required) }`
- **Response:** Workspace object
- **Errors:** `400`, `403`

**Source:** `apps/api/src/tenant/tenant.controller.ts:100-104`

### 3.11 Create Team
- **Method:** `POST`
- **Path:** `/api/organizations/:id/teams`
- **Auth:** JWT + Permission(`org.update`) + Tenant context
- **Request Body:** `{ workspaceId: string (required), name: string (required) }`
- **Response:** Team object
- **Errors:** `400`, `403`, `404`

**Source:** `apps/api/src/tenant/tenant.controller.ts:106-110`

---

## 4. USER MODULE (`api/users`)

### 4.1 Get My Profile
- **Method:** `GET`
- **Path:** `/api/users/me/profile`
- **Auth:** JWT required
- **Response:** User profile object
- **Errors:** `401`

**Source:** `apps/api/src/user/user.controller.ts:11-14`

### 4.2 Update My Profile
- **Method:** `PATCH`
- **Path:** `/api/users/me/profile`
- **Auth:** JWT required
- **Request Body:** `any` (untyped)
- **Response:** Updated profile object
- **Errors:** `400`, `401`

**Source:** `apps/api/src/user/user.controller.ts:16-19`

### 4.3 Update My Preferences
- **Method:** `PATCH`
- **Path:** `/api/users/me/preferences`
- **Auth:** JWT required
- **Request Body:** `Record<string, unknown>`
- **Response:** Updated preferences object
- **Errors:** `400`, `401`

**Source:** `apps/api/src/user/user.controller.ts:21-24`

### 4.4 Update My Notification Settings
- **Method:** `PATCH`
- **Path:** `/api/users/me/notification-settings`
- **Auth:** JWT required
- **Request Body:** `Record<string, unknown>`
- **Response:** Updated notification settings object
- **Errors:** `400`, `401`

**Source:** `apps/api/src/user/user.controller.ts:26-29`

### 4.5 Set Avatar
- **Method:** `POST`
- **Path:** `/api/users/me/avatar`
- **Auth:** JWT required
- **Request Body:** `{ avatarUrl: string }`
- **Response:** Updated user object
- **Errors:** `400`, `401`

**Source:** `apps/api/src/user/user.controller.ts:31-34`

### 4.6 Deactivate Account
- **Method:** `POST`
- **Path:** `/api/users/me/deactivate`
- **Auth:** JWT required
- **Response:** `{ deactivated: true }`
- **Errors:** `401`

**Source:** `apps/api/src/user/user.controller.ts:36-40`

### 4.7 Delete User
- **Method:** `DELETE`
- **Path:** `/api/users/:id`
- **Auth:** JWT required
- **Response:** `{ deleted: true }`
- **Errors:** `403`, `404`, `401`

**Source:** `apps/api/src/user/user.controller.ts:42-46`

---

## 5. PROJECT MODULE (`api/projects`)

### 5.1 List Projects
- **Method:** `GET`
- **Path:** `/api/projects`
- **Auth:** JWT + Permission(`project.read`) + Tenant context
- **Query Params:** Pagination/filter/search via `Record<string, any>`
- **Response:** Paginated project list
- **Errors:** `401`, `403`

**Source:** `apps/api/src/project/project.controller.ts:31-35`

### 5.2 Create Project
- **Method:** `POST`
- **Path:** `/api/projects`
- **Auth:** JWT + Permission(`project.create`) + Tenant context
- **Request Body:** `{ name: string (required), description?: string, workspaceId?: string }`
- **Response:** Created project object
- **Errors:** `400`, `403`

**Source:** `apps/api/src/project/project.controller.ts:37-41`

### 5.3 List Tasks for Project
- **Method:** `GET`
- **Path:** `/api/projects/:id/tasks`
- **Auth:** JWT + Permission(`project.task.read`) + Tenant context
- **Query Params:** `Record<string, any>`
- **Response:** Paginated task list
- **Errors:** `401`, `403`, `404`

**Source:** `apps/api/src/project/project.controller.ts:43-47`

### 5.4 Create Task
- **Method:** `POST`
- **Path:** `/api/projects/:id/tasks`
- **Auth:** JWT + Permission(`project.task.create`) + Tenant context
- **Request Body:** `{ title: string (required), description?: string, status?: string, priority?: string, assigneeId?: string }`
- **Response:** Created task object
- **Errors:** `400`, `403`, `404`

**Source:** `apps/api/src/project/project.controller.ts:49-53`

### 5.5 Add Task Comment
- **Method:** `POST`
- **Path:** `/api/projects/tasks/:taskId/comments`
- **Auth:** JWT + Permission(`project.task.read`) + Tenant context
- **Request Body:** `{ content: string (required) }`
- **Response:** Created comment object
- **Errors:** `400`, `403`, `404`

**Source:** `apps/api/src/project/project.controller.ts:55-59`

### 5.6 Activity Timeline
- **Method:** `GET`
- **Path:** `/api/activity`
- **Auth:** JWT + Permission(`project.read`) + Tenant context
- **Query Params:** `Record<string, any>`
- **Response:** Activity timeline array
- **Errors:** `401`, `403`

**Source:** `apps/api/src/project/project.controller.ts:67-71`

---

## 6. AI MODULE (`api/ai`)

### 6.1 AI Chat
- **Method:** `POST`
- **Path:** `/api/ai/chat`
- **Auth:** JWT + Permission(`ai.chat`) + Tenant context
- **Request Body:** `{ conversationId?: string, prompt: string (required), systemPrompt?: string }`
- **Response:** AI message response object
- **Errors:** `400` (empty prompt), `403`, `429` (rate limit — assumption)

**Source:** `apps/api/src/ai/ai.controller.ts:20-24`

### 6.2 List Conversations
- **Method:** `GET`
- **Path:** `/api/ai/conversations`
- **Auth:** JWT + Permission(`ai.chat`)
- **Response:** Array of conversation objects
- **Errors:** `401`, `403`

**Source:** `apps/api/src/ai/ai.controller.ts:26-30`

### 6.3 AI Usage Report
- **Method:** `GET`
- **Path:** `/api/ai/usage`
- **Auth:** JWT + Permission(`ai.usage.read`) + Tenant context
- **Response:** Usage report object (aggregated by model/date)
- **Errors:** `401`, `403`

**Source:** `apps/api/src/ai/ai.controller.ts:32-36`

### 6.4 List Prompts
- **Method:** `GET`
- **Path:** `/api/ai/prompts`
- **Auth:** JWT + Permission(`ai.prompt.manage`) + Tenant context
- **Response:** Array of prompt objects
- **Errors:** `401`, `403`

**Source:** `apps/api/src/ai/ai.controller.ts:38-42`

### 6.5 Create Prompt
- **Method:** `POST`
- **Path:** `/api/ai/prompts`
- **Auth:** JWT + Permission(`ai.prompt.manage`) + Tenant context
- **Request Body:** `any` (untyped) — likely `{ name, content, category, isSystem }`
- **Response:** Created prompt object
- **Errors:** `400`, `403`

**Source:** `apps/api/src/ai/ai.controller.ts:44-48`

---

## 7. BILLING MODULE (`api/billing`)

### 7.1 Get Subscription
- **Method:** `GET`
- **Path:** `/api/billing/subscription`
- **Auth:** JWT + Permission(`org.billing.read`) + Tenant context
- **Response:** Subscription object
- **Errors:** `401`, `403`

**Source:** `apps/api/src/billing/billing.controller.ts:23-27`

### 7.2 Change Plan
- **Method:** `POST`
- **Path:** `/api/billing/subscription/plan`
- **Auth:** JWT + Permission(`org.billing.manage`) + Tenant context
- **Request Body:** `ChangePlanDto` — `plan: PlanType` (required), `couponCode?`, `provider?`, `providerSubscriptionId?`, `amountCents?`
- **Response:** Updated subscription object
- **Errors:** `400`, `403`

**Source:** `apps/api/src/billing/billing.controller.ts:29-33`

### 7.3 Cancel Subscription
- **Method:** `POST`
- **Path:** `/api/billing/subscription/cancel`
- **Auth:** JWT + Permission(`org.billing.manage`) + Tenant context
- **Request Body:** `{ atPeriodEnd?: boolean }`
- **Response:** Updated subscription object
- **Errors:** `400`, `403`

**Source:** `apps/api/src/billing/billing.controller.ts:35-39`

### 7.4 List Invoices
- **Method:** `GET`
- **Path:** `/api/billing/invoices`
- **Auth:** JWT + Permission(`org.billing.read`) + Tenant context
- **Response:** Array of invoice objects
- **Errors:** `401`, `403`

**Source:** `apps/api/src/billing/billing.controller.ts:41-45`

### 7.5 List Coupons (Platform)
- **Method:** `GET`
- **Path:** `/api/billing/coupons`
- **Auth:** JWT + Permission(`platform.billing.manage`)
- **Response:** Array of coupon objects
- **Errors:** `401`, `403`

**Source:** `apps/api/src/billing/billing.controller.ts:47-51`

### 7.6 Create Coupon (Platform)
- **Method:** `POST`
- **Path:** `/api/billing/coupons`
- **Auth:** JWT + Permission(`platform.billing.manage`)
- **Request Body:** `any` (untyped)
- **Response:** Created coupon object
- **Errors:** `400`, `409`, `401`, `403`

**Source:** `apps/api/src/billing/billing.controller.ts:53-57`

---

## 8. FILE MODULE (`api/files`)

### 8.1 Upload File
- **Method:** `POST`
- **Path:** `/api/files/upload`
- **Auth:** JWT + Permission(`file.upload`) + Tenant context
- **Request:** Query Params (`UploadMetaDto`): `fileName` (string, required), `mimeType` (string, required), `sizeBytes` (number, required), `visibility` (`public`|`private`, optional)
- **Body:** `{ base64: string }` (base64-encoded file content)
- **Response:** File object
- **Errors:** `400`, `413` (assumed), `403`

**Source:** `apps/api/src/file/file.controller.ts:23-41`

### 8.2 List Files
- **Method:** `GET`
- **Path:** `/api/files`
- **Auth:** JWT + Permission(`file.read`) + Tenant context
- **Response:** Array of file objects
- **Errors:** `401`, `403`

**Source:** `apps/api/src/file/file.controller.ts:43-47`

### 8.3 Get Presigned URL
- **Method:** `GET`
- **Path:** `/api/files/:id/presign`
- **Auth:** JWT + Permission(`file.read`) + Tenant context
- **Response:** `{ url: string }`
- **Errors:** `401`, `403`, `404`

**Source:** `apps/api/src/file/file.controller.ts:49-53`

### 8.4 Create File Version
- **Method:** `POST`
- **Path:** `/api/files/:id/version`
- **Auth:** JWT + Permission(`file.upload`) + Tenant context
- **Request Body:** `{ base64: string, mimeType: string }`
- **Response:** New file version object
- **Errors:** `400`, `403`, `404`

**Source:** `apps/api/src/file/file.controller.ts:55-59`

### 8.5 Delete File
- **Method:** `DELETE`
- **Path:** `/api/files/:id`
- **Auth:** JWT + Permission(`file.delete`) + Tenant context
- **Response:** `{ removed: true }`
- **Errors:** `403`, `404`, `401`

**Source:** `apps/api/src/file/file.controller.ts:61-66`

---

## 9. SEARCH MODULE (`api/search`)

### 9.1 Global Search
- **Method:** `GET`
- **Path:** `/api/search/global`
- **Auth:** JWT + Permission(`org.read`) + Tenant context
- **Query Params:** `Record<string, any>` — exact params TBD
- **Response:** Search results object
- **Errors:** `401`, `403`

**Source:** `apps/api/src/search/search.controller.ts:12-16`

---

## 10. NOTIFICATION MODULE (`api/notifications`)

### 10.1 List Notifications
- **Method:** `GET`
- **Path:** `/api/notifications`
- **Auth:** JWT required (no explicit PermissionGuard on controller)
- **Query Param:** `unread` (`true` to filter unread only)
- **Response:** Array of notification objects
- **Errors:** `401`

**Source:** `apps/api/src/notification/notification.controller.ts:10-13`

### 10.2 Unread Count
- **Method:** `GET`
- **Path:** `/api/notifications/unread-count`
- **Auth:** JWT required
- **Response:** `{ count: number }`
- **Errors:** `401`

**Source:** `apps/api/src/notification/notification.controller.ts:15-18`

### 10.3 Mark Notification as Read
- **Method:** `PATCH`
- **Path:** `/api/notifications/:id/read`
- **Auth:** JWT required
- **Response:** `{ read: true }`
- **Errors:** `401`, `403`, `404`

**Source:** `apps/api/src/notification/notification.controller.ts:20-24`

### 10.4 Mark All as Read
- **Method:** `POST`
- **Path:** `/api/notifications/read-all`
- **Auth:** JWT required
- **Response:** `{ read: true }`
- **Errors:** `401`

**Source:** `apps/api/src/notification/notification.controller.ts:26-30`

---

## 11. DASHBOARD MODULE (`api/dashboard`)

### 11.1 Organization Dashboard KPIs
- **Method:** `GET`
- **Path:** `/api/dashboard/org`
- **Auth:** JWT + Permission(`dashboard.read`) + Tenant context
- **Response:** Dashboard KPIs object
- **Errors:** `401`, `403`

**Source:** `apps/api/src/dashboard/dashboard.controller.ts:13-17`

### 11.2 Revenue Analytics
- **Method:** `GET`
- **Path:** `/api/dashboard/revenue`
- **Auth:** JWT + Permission(`analytics.revenue.read`) + Tenant context
- **Response:** Revenue analytics object
- **Errors:** `401`, `403`

**Source:** `apps/api/src/dashboard/dashboard.controller.ts:19-23`

### 11.3 User Analytics
- **Method:** `GET`
- **Path:** `/api/dashboard/users`
- **Auth:** JWT + Permission(`analytics.user.read`) + Tenant context
- **Response:** User analytics object
- **Errors:** `401`, `403`

**Source:** `apps/api/src/dashboard/dashboard.controller.ts:25-29`

### 11.4 AI Spend
- **Method:** `GET`
- **Path:** `/api/dashboard/ai-spend`
- **Auth:** JWT + Permission(`ai.usage.read`) + Tenant context
- **Response:** AI spend summary object
- **Errors:** `401`, `403`

**Source:** `apps/api/src/dashboard/dashboard.controller.ts:31-35`

---

## 12. ADMIN MODULE (`api/admin`)

### 12.1 Platform Stats
- **Method:** `GET`
- **Path:** `/api/admin/stats`
- **Auth:** JWT + Permission(`platform.read`)
- **Response:** Platform-wide stats object
- **Errors:** `401`, `403`

**Source:** `apps/api/src/admin/admin.controller.ts:13-17`

### 12.2 List Users (Platform)
- **Method:** `GET`
- **Path:** `/api/admin/users`
- **Auth:** JWT + Permission(`platform.users.manage`)
- **Response:** Array of user objects
- **Errors:** `401`, `403`

**Source:** `apps/api/src/admin/admin.controller.ts:19-23`

### 12.3 List Organizations (Platform)
- **Method:** `GET`
- **Path:** `/api/admin/organizations`
- **Auth:** JWT + Permission(`platform.orgs.manage`)
- **Response:** Array of organization objects
- **Errors:** `401`, `403`

**Source:** `apps/api/src/admin/admin.controller.ts:25-29`

### 12.4 List Feature Flags
- **Method:** `GET`
- **Path:** `/api/admin/feature-flags`
- **Auth:** JWT + Permission(`platform.feature_flags`)
- **Response:** Array of feature flag objects
- **Errors:** `401`, `403`

**Source:** `apps/api/src/admin/admin.controller.ts:31-35`

### 12.5 Set Feature Flag
- **Method:** `POST`
- **Path:** `/api/admin/feature-flags`
- **Auth:** JWT + Permission(`platform.feature_flags`)
- **Request Body:** `{ key: string, enabled: boolean }`
- **Response:** Updated/created feature flag object
- **Errors:** `400`, `401`, `403`

**Source:** `apps/api/src/admin/admin.controller.ts:37-41`

---

## 13. HEALTH MODULE (`api/health`)

### 13.1 Health Check
- **Method:** `GET`
- **Path:** `/api/health`
- **Auth:** Public
- **Response:** Terminus composite health check — `{ status, info: { database, memory_heap, redis }, error?, details? }`
- **Errors:** `503` if any check fails

**Source:** `apps/api/src/core/health/health.controller.ts:16-32`

### 13.2 Liveness Probe
- **Method:** `GET`
- **Path:** `/api/health/live`
- **Auth:** Public
- **Response:** `{ status: "ok" }`
- **Errors:** None (always 200)

**Source:** `apps/api/src/core/health/health.controller.ts:34-38`

---

## 14. SWAGGER / OPENAPI DOCS

- **Path:** `/api/docs`
- **Auth:** None
- **Description:** Auto-generated Swagger UI with Bearer auth and `x-organization-id` API key configured
- **Source:** `apps/api/src/main.ts:22-30`

---

## 15. FLAGS & GAPS

| Item | Status |
|------|--------|
| Webhook endpoints (Stripe/Billplz) | [NEEDS CONFIRMATION] — not found in controller scan |
| Email templates/service endpoints | [NEEDS CONFIRMATION] — EmailModule exists but no explicit controller found |
| Worker queue endpoints | [NEEDS CONFIRMATION] — WorkerModule exists but no explicit controller found |
| File download/stream endpoint | [NEEDS CONFIRMATION] — only presign URL found |
| Search filter/sort schema | [NEEDS CONFIRMATION] — controller uses `Record<string, any>` for queries |
| Pagination standard | Partially evidenced by `ApiMeta` interface — page, limit, total, totalPages |
