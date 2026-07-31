# Security Architecture — Request Flow Sequence Diagram

```
Client (Browser)
    │
    │  1. HTTPS Request (TLS 1.3)
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  WAF / CDN (Cloudflare / AWS WAF)                              │
│  • DDoS protection                                             │
│  • Bot detection & CAPTCHA on sensitive endpoints              │
│  • IP reputation scoring                                       │
│  • Rate limiting (edge)                                        │
│  • WAF rules (SQLi, XSS, LFI, RFI signature matching)         │
│  • Geo-blocking / threat intel                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
    │  2. HTTP Request (cleaned)
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Middleware (middleware.ts)                             │
│  • Auth redirect (unauthenticated → /login)                    │
│  • Auth page bypass (already logged in → /dashboard)           │
│  • Security header injection (X-Frame-Options, CSP, etc.)     │
│  • Cache control for dashboard routes                          │
│  • Static asset passthrough                                    │
│  • Cookie-based session check (no localStorage tokens)        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
    │  3. Gateway Request (signed internal JWT / HMAC)
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js API Gateway (/api/gateway/[...path])                  │
│  • Rewrites to NestJS backend (internal only)                  │
│  • Attaches x-organization-id from cookie                      │
│  • Signs request with HMAC-SHA256 (internal signing)           │
│  • Adds x-internal-signature + x-internal-timestamp headers    │
│  • Proxies response back to client                             │
│  • Strips sensitive headers from backend response              │
└──────────────────────┬──────────────────────────────────────────┘
                       │  4. Internal HTTP (localhost / private network)
                       │     Headers: Authorization: Bearer <token>
                       │              x-organization-id: <orgId>
                       │              x-internal-signature: <HMAC>
                       │              x-internal-timestamp: <ts>
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  NestJS API (Backend — private network / VPC)                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Global Pipeline (app.module.ts)                        │   │
│  │  ├── ThrottlerGuard (rate limiting: 120 req/min global) │   │
│  │  ├── JwtAuthGuard (JWT validation, skips @Public())    │   │
│  │  ├── PermissionGuard (RBAC enforcement)                 │   │
│  │  ├── CsrfGuard (CSRF token check for state-changing)   │   │
│  │  ├── InternalRequestGuard (HMAC signature verification)│   │
│  │  └── SessionBindingGuard (device/IP token binding)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Interceptors (global)                                  │   │
│  │  ├── ResponseInterceptor (envelope wrapping)            │   │
│  │  ├── RequestLoggingInterceptor (structured logging)     │   │
│  │  ├── SecurityHeadersInterceptor (CSP, HSTS, etc.)      │   │
│  │  ├── AuditInterceptor (PII-safe audit trail)            │   │
│  │  └── SanitizeInterceptor (output XSS sanitization)      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Exception Filter (global)                              │   │
│  │  • Generic error messages (no stack traces leaked)      │   │
│  │  • PII sanitization in error messages                   │   │
│  │  • Structured { success, message, data, meta } envelope │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Business Logic (Services)                              │   │
│  │  • Organization-scoped queries                          │   │
│  │  • Input validation (class-validator + class-transformer)│   │
│  │  • Parameterized queries (TypeORM) → SQLi prevention    │   │
│  │  • Audit logging via AuditService                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Database (PostgreSQL, private subnet)                   │   │
│  │  • TLS connection                                       │   │
│  │  • Field-level encryption for sensitive columns         │   │
│  │  • Connection pooling                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Layer-by-Layer Breakdown

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| **1. Edge** | WAF / CDN | DDoS, bot detection, WAF rules, geo-blocking, edge rate limiting |
| **2. Frontend** | Next.js Middleware | Auth redirects, security headers, cache control, static asset passthrough |
| **3. Gateway** | Next.js API Routes | Internal request signing, header injection, proxy to backend |
| **4. Transport** | TLS 1.3 | Encryption in transit, HSTS enforcement |
| **5. Auth** | JwtAuthGuard + CsrfGuard + SessionBindingGuard | Token validation, CSRF check, device/IP binding |
| **6. Authz** | PermissionGuard | RBAC enforcement via @Permissions() decorator |
| **7. Rate Limit** | ThrottlerGuard | Per-IP/per-user rate limiting (stricter on auth endpoints) |
| **8. Validation** | ValidationPipe + SanitizeInterceptor | DTO validation, output XSS sanitization |
| **9. Audit** | AuditInterceptor + RequestLoggingInterceptor | Structured PII-safe logging, audit trail |
| **10. Error** | AllExceptionsFilter | Generic error messages, no stack trace leakage |
| **11. Data** | TypeORM + PostgreSQL | Parameterized queries, field-level encryption, TLS |

## Key Security Decisions

1. **No localStorage tokens** — Access and refresh tokens are stored in httpOnly, sameSite=Strict cookies, preventing XSS token theft.
2. **Internal request signing** — All requests from Next.js to NestJS are signed with HMAC-SHA256, ensuring only the gateway can reach the backend.
3. **Zero trust network** — NestJS backend is in a private VPC/subnet, only reachable via the Next.js gateway or internal network.
4. **Defense in depth** — Input validation at DTO level (class-validator), output sanitization (SanitizeInterceptor), and WAF rules provide layered protection.
5. **PII-safe logging** — Audit logs redact sensitive fields (passwords, tokens, secrets) automatically via the AuditInterceptor.
```