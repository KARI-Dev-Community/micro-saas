# Authentication & Security Flow

## Login (credentials)
```
Client ──POST /auth/login──▶ AuthService.login()
        ◀── { accessToken, refreshToken, expiresIn, user } ──
Store tokens (Zustand + localStorage); send accessToken as Bearer.
```

- **Access token**: short-lived (15m), stateless JWT carrying `sub`, `email`,
  `organizationId`, `perms` (resolved RBAC set), `sid` (session jti).
- **Refresh token**: long-lived (30d), stored in `sessions` table (auditable) and
  mirrored in Redis (`refresh:<jti>`) for instant revocation.

## Token refresh
```
Client ──POST /auth/refresh {refreshToken}──▶ verify JWT + Redis lookup
        ◀── new access+refresh pair ──
```
The web `api-client` auto-refreshes once on `401`.

## Logout / Session revocation
- `POST /auth/logout` deletes the `sessions` row + Redis key (single device).
- `POST /auth/logout-all` revokes every active session for the user.
- `DELETE /auth/security/sessions/:id` revokes a specific device.

## Email verification
Register → `emailVerificationToken` set → email link → `GET /auth/verify-email`
sets `emailVerified=true`, `status=active`.

## Forgot / Reset password
`forgot-password` issues a TTL `passwordResetToken` + email; `reset-password`
verifies and updates `passwordHash`.

## Social login (Google)
`/auth/google/login` → Google consent → `/auth/google/callback` exchanges code,
upserts the user (`provider=google`, `emailVerified=true`), issues tokens.

## Two-Factor (TOTP)
`2fa/enable` generates a `speakeasy` secret; `2fa/confirm` verifies the code and
sets `twoFactorEnabled=true`. On login, if 2FA is enabled the API returns
`{ twoFactorRequired: true, userId }` and the client must complete the TOTP step
before tokens are issued.

## Passkeys (WebAuthn)
`/auth/security/passkeys` CRUD. Credential public keys are stored; challenge/verify
uses `@simplewebauthn` in production (storage scaffold provided).

## Secrets & headers
- `JWT_SECRET` signs both tokens (HS256). Keep server-only.
- `x-organization-id` selects the active tenant for every scoped route.
- Passwords hashed with `bcryptjs` (cost 10).
- Rate limiting via `@nestjs/throttler` (global).
