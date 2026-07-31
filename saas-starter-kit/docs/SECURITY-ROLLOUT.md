# Security Rollout Plan

## Phase 1: Core Authentication, Authorization & Validation

### Goals
- Enforce JWT validation on all protected routes
- Implement RBAC with permission guards
- Add input validation and sanitization
- Apply per-IP/per-user rate limiting with stricter limits on auth endpoints

### Deliverables
| # | Item | Status |
|---|------|--------|
| 1.1 | `JwtAuthGuard` — global guard, skips `@Public()` routes | ✅ Existing |
| 1.2 | `PermissionGuard` — RBAC enforcement via `@Permissions()` | ✅ Existing |
| 1.3 | `ValidationPipe` — DTO validation with `class-validator` | ✅ Existing |
| 1.4 | `ThrottlerGuard` — global rate limiting (120 req/min) | ✅ Existing |
| 1.5 | **Auth endpoint rate limiting** — stricter limits (10 req/min) on `/auth/login`, `/auth/register`, `/auth/forgot-password` | 🔲 New |
| 1.6 | **Input sanitization** — XSS pattern stripping in `SanitizeInterceptor` | 🔲 New |
| 1.7 | **CSRF guard** — token validation for state-changing endpoints | 🔲 New |
| 1.8 | **Session binding** — device/IP token binding via `SessionBindingGuard` | 🔲 New |

### Auth Endpoint Rate Limiting Configuration
```typescript
// In auth module or app.module.ts
ThrottlerModule.forRoot([
  { ttl: 60000, limit: 120 }, // global default
  { ttl: 60000, limit: 10, path: /^\/api\/auth\/(login|register|forgot-password)$/ },
])
```

### Rollout Steps
1. Deploy `CsrfGuard` and `SessionBindingGuard` to staging
2. Configure auth endpoint rate limits in `ThrottlerModule.forRoot`
3. Enable `SanitizeInterceptor` for output XSS protection
4. Run manual penetration testing on auth endpoints
5. Monitor rate limit triggers in logs for 1 week
6. Promote to production

---

## Phase 2: Security Headers, CORS Hardening & Audit Logging

### Goals
- Inject security headers on every response
- Harden CORS with explicit allowed origins
- Implement structured, PII-safe audit logging
- Add CSRF cookie-based state change protection

### Deliverables
| # | Item | Status |
|---|------|--------|
| 2.1 | **Helmet.js integration** — HSTS, CSP, X-Frame-Options, etc. | 🔲 New |
| 2.2 | **SecurityHeadersInterceptor** — per-response header injection | 🔲 New |
| 2.3 | **CORS hardening** — explicit origin allowlist, credentials-only | 🔲 New |
| 2.4 | **AuditInterceptor** — PII-safe structured logging | 🔲 New |
| 2.5 | **RequestLoggingInterceptor** — structured request logging | ✅ Existing |
| 2.6 | **CSRF cookie issuance** — set `__Host-csrf-token` on login | 🔲 New |

### Rollout Steps
1. Deploy `SecurityHeadersInterceptor` with permissive CSP first
2. Tighten CSP policy over 2 weeks based on console reports
3. Enable HSTS with `max-age=31536000` and `includeSubDomains`
4. Deploy `AuditInterceptor` and verify PII redaction
5. Harden CORS to explicit origin list (remove wildcard)
6. Implement CSRF cookie issuance in auth login flow
7. Monitor CSP violation reports for 1 week

---

## Phase 3: Zero Trust, WAF & Encryption

### Goals
- Implement zero-trust network architecture between frontend and backend
- Deploy WAF and DDoS protection
- Add TLS 1.3 enforcement and field-level encryption
- Implement signed internal JWTs between Next.js and NestJS

### Deliverables
| # | Item | Status |
|---|------|--------|
| 3.1 | **API Gateway pattern** — Next.js routes as sole path to backend | 🔲 New |
| 3.2 | **Internal request signing** — HMAC-SHA256 between gateway and backend | 🔲 New |
| 3.3 | **WAF deployment** — Cloudflare/AWS WAF with managed rules | 🔲 New |
| 3.4 | **DDoS protection** — edge rate limiting + bot detection | 🔲 New |
| 3.5 | **mTLS or signed internal JWTs** — backend isolated in private VPC | 🔲 New |
| 3.6 | **TLS 1.3 enforcement** — Nginx config, HSTS preload | 🔲 New |
| 3.7 | **Field-level encryption** — encrypt sensitive DB columns (PII) | 🔲 New |
| 3.8 | **File upload security** — magic-byte validation, malware scanning | 🔲 New |
| 3.9 | **Encrypted backups** — encrypted at rest, rotated keys | 🔲 New |

### Rollout Steps
1. Deploy Next.js API gateway routes, route all frontend traffic through `/api/gateway`
2. Enable internal request signing with `INTERNAL_SIGNING_SECRET`
3. Deploy Cloudflare/AWS WAF with OWASP Core Rule Set
4. Configure DDoS protection with edge rate limiting
5. Move NestJS backend to private subnet (no public IP)
6. Enforce TLS 1.3 in Nginx, enable HSTS preload
7. Implement field-level encryption for PII columns
8. Set up encrypted backups with key rotation
9. Run red team exercise to validate zero-trust architecture

---

## Phase 4: Compliance, Monitoring & Incident Response

### Goals
- Achieve GDPR/CCPA compliance
- Implement security-specific alerting and monitoring
- Create incident response runbooks
- Generate SBOM and supply chain security artifacts

### Deliverables
| # | Item | Status |
|---|------|--------|
| 4.1 | **GDPR/CCPA data handling** — consent tracking, data export, right-to-erasure | 🔲 New |
| 4.2 | **Audit log retention** — immutable audit logs with configurable retention | 🔲 New |
| 4.3 | **Kill switch** — disable compromised endpoints at runtime | 🔲 New |
| 4.4 | **Security alerting** — Sentry/Datadog integration for anomalies | 🔲 New |
| 4.5 | **Breach runbooks** — documented incident response procedures | 🔲 New |
| 4.6 | **SBOM generation** — software bill of materials in CI | 🔲 New |
| 4.7 | **Lockfile integrity** — `npm audit` + Snyk in CI pipeline | 🔲 New |
| 4.8 | **Signed commits** — GPG/SSH commit signing enforcement | 🔲 New |

### Rollout Steps
1. Implement GDPR data export and right-to-erasure endpoints
2. Configure audit log retention (e.g., 7 years for compliance)
3. Deploy kill switch mechanism via feature flags
4. Integrate Sentry for error tracking + Datadog for security monitoring
5. Write and review breach runbooks with security team
6. Add SBOM generation step to CI pipeline
7. Enable lockfile auditing in CI (`npm audit`, Snyk)
8. Enforce signed commits via branch protection rules

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 1–2 weeks | None |
| Phase 2 | 1–2 weeks | Phase 1 complete |
| Phase 3 | 2–4 weeks | Phase 2 complete, infrastructure changes |
| Phase 4 | 2–3 weeks | Phase 3 complete, compliance review |

## Rollback Plan

Each phase can be rolled back independently:
- **Phase 1**: Disable `CsrfGuard` and `SessionBindingGuard` by removing from `SecurityModule` providers
- **Phase 2**: Remove `SecurityHeadersInterceptor` and `AuditInterceptor` from providers
- **Phase 3**: Disable internal signing by removing `INTERNAL_SIGNING_SECRET`; revert gateway routing
- **Phase 4**: Disable kill switch by setting `KILL_SWITCH_ENABLED=false`; remove GDPR endpoints

## Success Criteria

- [ ] Zero critical/high vulnerabilities in `npm audit` and Snyk scan
- [ ] All endpoints protected by at least one guard
- [ ] No PII in audit logs or error responses
- [ ] CSP violation rate below 0.1% of requests
- [ ] Rate limit triggers monitored and tuned
- [ ] WAF rules pass OWASP ZAP baseline scan
- [ ] Penetration test completed with no critical findings
- [ ] GDPR data subject access requests handled within 30 days