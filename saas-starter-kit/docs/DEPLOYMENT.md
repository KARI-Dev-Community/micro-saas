# Production Deployment Guide

## Architecture

```
Internet ──▶ Nginx (80) ──▶ /  → web (Next.js :3000)
                     └────▶ /api, /docs, /health → api (NestJS :3001)
                                          │
                              ┌───────────┼───────────┐
                            Postgres     Redis       (BullMQ workers in same api process)
```

Nginx terminates requests and routes `/api` to the NestJS API. The API process also
hosts the BullMQ workers (queues + consumers in one deployment for simplicity; split
into a dedicated worker service at scale).

## Option A — Docker Compose (single host)

```bash
cp .env.example .env
# Set: JWT_SECRET (strong), DB_*, REDIS_*, EMAIL_PROVIDER, FRONTEND_URL, NEXT_PUBLIC_API_URL
docker compose up -d
```

This starts postgres, redis, api (runs migrations then boots), web, and nginx.
The app is served on `http://<host>`.

## Option B — PM2 (bare metal / VPS)

```bash
npm ci
npm run build --workspaces
npm run migrate --workspace apps/api
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # enable boot-start
```

`ecosystem.config.js` runs `saas-api` (cluster mode) and `saas-web` with memory
restarts. Put Nginx in front:

```nginx
server {
  location /api/ { proxy_pass http://127.0.0.1:3001/api/; }
  location /docs { proxy_pass http://127.0.0.1:3001/docs; }
  location / { proxy_pass http://127.0.0.1:3000; }
}
```

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` runs on every push/PR:
1. `npm ci`
2. Typecheck + build + lint for `apps/api` and `apps/web`
3. Builds Docker images

For CD, add a deploy job (e.g. SSH into the host and `docker compose pull && up -d`,
or push images to a registry and roll out). Secrets: `JWT_SECRET`, `DB_*`,
`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, etc.

## Hardening checklist

- [ ] Strong `JWT_SECRET`; different per environment.
- [ ] PostgreSQL with TLS; least-privilege DB user.
- [ ] Redis with `requirepass` (set `REDIS_PASSWORD`); use a private network.
- [ ] `EMAIL_PROVIDER` wired to a real provider (SMTP/Resend/SES).
- [ ] `STORAGE_PROVIDER=aws` (S3/MinIO) instead of local disk for files.
- [ ] HTTPS via Certbot/`listen 443 ssl` in Nginx.
- [ ] Real Stripe webhooks (`STRIPE_WEBHOOK_SECRET`) to sync subscription status.
- [ ] Rate limits tuned in `@nestjs/throttler` (global) per route if needed.
- [ ] Sentry/OTel for error + request logging in production.
- [ ] Backups for Postgres (`pg_dump` / managed snapshots).

## MySQL variant

Set `DB_TYPE=mysql` and `DB_PORT=3306`. The migration uses PostgreSQL DDL; for MySQL
generate a MySQL-flavored migration (`DB_TYPE=mysql npm run migration:generate`) or
adapt `apps/api/src/database/migrations/0000000000001-initial-schema.ts`
(uuid → char(36), timestamptz → datetime, jsonb → json, GIN → FULLTEXT).
