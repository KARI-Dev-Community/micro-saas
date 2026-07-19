# API Specification

Base URL: `/api` (proxied by Nginx to `:3001`). Auth: `Authorization: Bearer <accessToken>`.
Tenant-scoped routes also require `x-organization-id: <orgId>`.

## Auth (`/auth`)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | /auth/register | – | {email, password, firstName?, lastName?} | Register (sends verify email) |
| POST | /auth/login | – | {email, password, device?} | Login (returns access+refresh; 2FA challenge if enabled) |
| POST | /auth/refresh | – | {refreshToken} | Rotate tokens |
| POST | /auth/logout | ✅ | {refreshToken} | Revoke current session |
| POST | /auth/logout-all | ✅ | – | Revoke all sessions |
| GET | /auth/verify-email?token= | – | – | Verify email |
| POST | /auth/forgot-password | – | {email} | Send reset link |
| POST | /auth/reset-password | – | {token, password} | Reset password |
| POST | /auth/change-password | ✅ | {current, next} | Change password |
| GET | /auth/me | ✅ | – | Current user + permissions |
| GET | /auth/google/login | – | – | Google OAuth start |
| GET | /auth/google/callback | – | code | Google OAuth callback |
| POST | /auth/security/2fa/enable | ✅ | – | Start TOTP (returns secret+otpauth) |
| POST | /auth/security/2fa/confirm | ✅ | {code} | Confirm TOTP |
| POST | /auth/security/2fa/disable | ✅ | – | Disable 2FA |
| GET | /auth/security/sessions | ✅ | – | List active sessions |
| DELETE | /auth/security/sessions/:id | ✅ | – | Revoke a session |
| GET/POST/DELETE | /auth/security/passkeys | ✅ | – | Passkey (WebAuthn) CRUD |

## Organizations & RBAC (`/organizations`) — requires `x-organization-id` + permission
| Method | Path | Permission |
|--------|------|-----------|
| GET | /organizations/mine | authenticated |
| POST | /organizations | authenticated (creates owner membership) |
| GET | /organizations/:id | org.read |
| PATCH | /organizations/:id | org.update |
| GET | /organizations/:id/members | org.read |
| POST | /organizations/:id/members/invite | org.members.invite |
| POST | /organizations/:id/members/:mid/role | org.members.role |
| DELETE | /organizations/:id/members/:mid | org.members.remove |
| GET/POST | /organizations/:id/workspaces | org.read / org.update |
| POST | /organizations/:id/teams | org.update |

## Billing (`/billing`)
| Method | Path | Permission |
|--------|------|-----------|
| GET | /billing/subscription | org.billing.read |
| POST | /billing/subscription/plan | org.billing.manage |
| POST | /billing/subscription/cancel | org.billing.manage |
| GET | /billing/invoices | org.billing.read |
| GET/POST | /billing/coupons | platform.billing.manage |

## Users (`/users`)
| Method | Path | Permission |
|--------|------|-----------|
| GET | /users/me/profile | authenticated |
| PATCH | /users/me/profile | user.update |
| PATCH | /users/me/preferences | user.update |
| PATCH | /users/me/notification-settings | user.update |
| POST | /users/me/avatar | user.update |
| POST | /users/me/deactivate | user.update |
| DELETE | /users/:id | user.delete |

## Projects (`/projects`)
| Method | Path | Permission |
|--------|------|-----------|
| GET | /projects | project.read (paginated) |
| POST | /projects | project.create (free-tier cap enforced) |
| GET | /projects/:id/tasks | project.task.read |
| POST | /projects/:id/tasks | project.task.create |
| POST | /projects/tasks/:taskId/comments | project.task.read |

## AI (`/ai`)
| Method | Path | Permission |
|--------|------|-----------|
| POST | /ai/chat | ai.chat (enqueues BullMQ job, tracks usage/cost) |
| GET | /ai/conversations | ai.chat |
| GET | /ai/usage | ai.usage.read |
| GET/POST | /ai/prompts | ai.prompt.manage |

## Notifications / Search / Dashboard / Admin
- `/notifications` — list, unread-count, mark-read, read-all (`notification.read`)
- `/search/global` — global FTS with filters/pagination (`org.read`)
- `/dashboard/org` `/dashboard/revenue` `/dashboard/users` `/dashboard/ai-spend`
- `/admin/stats` `/admin/users` `/admin/organizations` `/admin/feature-flags`

All responses: `{ success, message, data, meta }`. Pagination meta: `{ page, limit, total, totalPages }`.
