# Deployment & Environment Setup

**Version:** 1.0 (Draft)
**Date Generated:** 2025-07-31
**Source:** `saas-starter-kit` repository — `docker-compose.yml`, `Dockerfile.api`, `Dockerfile.web`, `nginx/default.conf`, `ecosystem.config.js`, `.env.example`
**Author:** Generated via reverse-engineering from codebase

---

## 1. OVERVIEW

This document describes the deployment architecture, container orchestration, build process, environment variables, and production runes for the SaaS Starter Kit. Two deployment modes are evident:

1. **Docker Compose (recommended for production-like environments):** Uses Nginx as reverse proxy, with separate containers for API, web, Postgres, and Redis.
2. **PM2 (alternative bare-metal/VPS deployment):** Uses `ecosystem.config.js` for Node process management without Docker.

---

## 2. DOCKER COMPOSE ORCHESTRATION

**Source:** `docker-compose.yml`

### 2.1 Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | `postgres:16-alpine` | `5432:5432` | Primary database with persistent `pgdata` volume |
| `redis` | `redis:7-alpine` | `6379:6379` | Cache, session store, BullMQ backend |
| `api` | Built from `Dockerfile.api` | `3001` (internal) | NestJS backend API |
| `web` | Built from `Dockerfile.web` | `3000` (internal) | Next.js frontend |
| `nginx` | `nginx:1.27-alpine` | `8080:80` | Reverse proxy |

### 2.2 Service Dependencies & Health Checks

- **postgres** — Health check: `pg_isready -U ${DB_USERNAME:-saas}` (interval 5s, retries 10)
- **redis** — Health check: `redis-cli ping` (interval 5s, retries 10)
- **api** — Depends on `postgres` and `redis` being `healthy`. Health check: `nc -z localhost 3001` (interval 10s, start period 30s).
- **web** — Depends on `api` being `healthy`. Health check: `nc -z localhost 3000` (interval 10s, start period 30s).
- **nginx** — Depends on `api` and `web` being `healthy`.

### 2.3 API Startup Sequence

The API container runs migrations before starting the NestJS server:

```bash
node /app/node_modules/typeorm/cli.js migration:run -d dist/apps/api/src/config/typeorm-cli.js
node dist/apps/api/src/main.js
```

**Source:** `docker-compose.yml:60`

**Implication:** If migrations fail, the container exits and health check never passes. This is a blocking startup sequence.

---

## 3. BUILD ARTIFACTS

### 3.1 API Docker Build (`Dockerfile.api`)

- **Multi-stage build:**
  - **Builder stage:** `node:20-alpine` installs workspace deps, runs `npm run build --workspace apps/api`
  - **Runtime stage:** `node:20-alpine` copies only built dist, node_modules, and packages
- **Exposed port:** `3001`
- **CMD:** `node dist/apps/api/src/main.js`
- **Source:** `Dockerfile.api`

### 3.2 Web Docker Build (`Dockerfile.web`)

- **Multi-stage build:**
  - **Builder stage:** `node:20-alpine` installs workspace deps, runs `npm run build --workspace apps/web`
  - **Runtime stage:** `node:20-alpine` copies `.next`, `public`, and node_modules
- **Exposed port:** `3000`
- **CMD:** `npm start` (Next.js production server)
- **Source:** `Dockerfile.web`

---

## 4. REVERSE PROXY (NGINX)

**Source:** `nginx/default.conf`

### 4.1 Routing Rules

| Client Request | Proxied To | Notes |
|----------------|------------|-------|
| `/` (root) | `http://web:3000` | Next.js SSR/SSG, WebSocket upgrade headers passed |
| `/api/` | `http://api:3001/api/` | API path prefix stripped/rewritten |
| `/docs` | `http://api:3001/docs` | Swagger UI |
| `/health` | `http://api:3001/api/health` | Note: adds `/api` prefix for health check |

### 4.2 Headers Forwarded

- `X-Real-IP`
- `X-Forwarded-For`
- `X-Forwarded-Proto`
- `Host`
- `Upgrade` / `Connection` (for WebSocket support on `/`)

---

## 5. PM2 DEPLOYMENT (ALTERNATIVE)

**Source:** `ecosystem.config.js`

| App Name | Script | Instances | Memory Limit | Port |
|----------|--------|-----------|--------------|------|
| `saas-api` | `dist/apps/api/src/main.js` | `max` (cluster mode) | `512M` restart threshold | `3001` |
| `saas-web` | `next/dist/bin/next start -p 3000` | `1` | Not specified | `3000` |

**PM2 Features Used:**
- Exponential backoff restarts (`exp_backoff_restarts: true`) for API
- Auto-restart on memory limit breach for API (`max_memory_restart: "512M"`)
- Cluster mode for API (utilizes all CPU cores)
- [ASSUMPTION] PM2 is started manually or via systemd; no startup script is visible in the repo.

---

## 6. DATABASE MIGRATION STRATEGY

| Mode | Behavior |
|------|----------|
| **Development** | `DB_SYNCHRONIZE=true` auto-syncs schema from entities (not recommended for production) |
| **Production (Docker)** | `DB_SYNCHRONIZE=false`; migrations are run explicitly via `typeorm migration:run` before app start |
| **CLI** | `npm run migrate` runs TypeORM migrations |

**Source:** `docker-compose.yml:60`, `apps/api/src/config/database.config.ts:12`

---

## 7. ENVIRONMENT VARIABLES REFERENCE

### 7.1 Application

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `NODE_ENV` | `development` | Environment mode | No |
| `PORT` | `3001` | API listen port | No |
| `API_PREFIX` | `api` | Global route prefix | No |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin + Google OAuth redirect base | No |

### 7.2 JWT

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `JWT_SECRET` | *(none)* | HS256 signing secret | **Yes** |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token TTL | No |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh token TTL | No |

### 7.3 Database

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `DB_TYPE` | `postgres` | `postgres` or `mysql` | No |
| `DB_HOST` | `localhost` | Database host | No |
| `DB_PORT` | `5432` | Database port | No |
| `DB_USERNAME` | `saas` | Database username | No |
| `DB_PASSWORD` | `saas` | Database password | No |
| `DB_DATABASE` | `saas` | Database name | No |
| `DB_SYNCHRONIZE` | `false` | Auto-sync schema (dev only) | No |
| `DB_LOGGING` | `false` | Enable query logging | No |

### 7.4 Redis

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `REDIS_HOST` | `localhost` | Redis host | No |
| `REDIS_PORT` | `6379` | Redis port | No |
| `REDIS_PASSWORD` | *(none)* | Redis password (optional) | No |

### 7.5 Billing

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `STRIPE_SECRET_KEY` | *(none)* | Stripe secret key | For billing |
| `STRIPE_WEBHOOK_SECRET` | *(none)* | Stripe webhook signing secret | For webhooks |
| `FREE_PROJECT_LIMIT` | `3` | Max projects for free-tier orgs | No |

### 7.6 AI

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `OPENAI_API_KEY` | *(none)* | OpenAI API key | For AI features |
| `AI_CHAT_MODEL` | `gpt-4o-mini` | Default chat model | No |

### 7.7 Authentication (Social)

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `GOOGLE_CLIENT_ID` | *(none)* | Google OAuth client ID | For Google login |
| `GOOGLE_CLIENT_SECRET` | *(none)* | Google OAuth client secret | For Google login |

### 7.8 Email

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `EMAIL_PROVIDER` | `console` | Email backend | No |
| `EMAIL_FROM` | `no-reply@saas.dev` | Sender address | No |

### 7.9 Storage

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `STORAGE_PROVIDER` | `local` | Storage backend | No |
| `STORAGE_LOCAL_DIR` | `./uploads` | Local upload directory | No |
| `STORAGE_BASE_URL` | `http://localhost:3001/files` | Public base URL for file access | No |

### 7.10 Frontend (Next.js)

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API base URL for frontend | No |

---

## 8. DEVELOPMENT WORKFLOW

### 8.1 Command Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install all workspace dependencies |
| `npm run dev:api` | Start NestJS dev server on `localhost:3001` |
| `npm run dev:web` | Start Next.js dev server on `localhost:3000` |
| `npm run build` | Production build across all workspaces |
| `npm run lint` / `npm run typecheck` | Code quality |
| `npm run migrate` | Run TypeORM migrations |
| `npm run docker:up` | Start Postgres + Redis via Docker Compose |
| `npm run docker:down` | Stop Docker Compose services |

### 8.2 Local Development Prerequisites

1. **Node.js >= 20**
2. **npm 11.12.1**
3. **Docker & Docker Compose** — for Postgres and Redis
4. **PostgreSQL 16** — or use `npm run docker:up` to start local instance
5. **Redis 7** — or use `npm run docker:up`

### 8.3 Local Start Sequence

```bash
# 1. Start infrastructure
npm run docker:up

# 2. Install dependencies
npm install

# 3. Run database migrations
npm run migrate

# 4. Start API (terminal 1)
npm run dev:api

# 5. Start Web (terminal 2)
npm run dev:web
```

---

## 9. PRODUCTION DEPLOYMENT CHECKLIST

### 9.1 Pre-Deployment

- [ ] Set `JWT_SECRET` to a strong, random value (min 32 characters recommended)
- [ ] Set database credentials (`DB_USERNAME`, `DB_PASSWORD`) to non-default values
- [ ] Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` if billing is enabled
- [ ] Configure `OPENAI_API_KEY` if AI features are enabled
- [ ] Configure `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` if Google OAuth is enabled
- [ ] Configure `EMAIL_PROVIDER` to a real SMTP provider (not `console`)
- [ ] Configure `STORAGE_PROVIDER` and `STORAGE_BASE_URL` for file serving in production
- [ ] Verify `DB_SYNCHRONIZE=false` (should be false in production)
- [ ] Verify migrations exist and have been tested

### 9.2 Docker Compose Deployment

```bash
# Build and start all services
docker compose up -d --build

# Check health
docker compose ps
curl http://localhost:8080/health

# View logs
docker compose logs -f api
docker compose logs -f web
```

**Ports exposed externally:**
- `8080` — Nginx (HTTP; TLS termination occurs here or upstream)
- `5432` — PostgreSQL (should be firewalled in production)
- `6379` — Redis (should be firewalled in production)

### 9.3 PM2 Deployment (Bare Metal)

```bash
# Build
npm run build

# Run migrations
npm run migrate

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 10. KNOWN GAPS & RECOMMENDATIONS

| Gap | Recommendation |
|-----|---------------|
| No TLS in Nginx config | Add SSL certificates and redirect HTTP -> HTTPS |
| No backup automation | Add `pg_dump` cron job or WAL archiving |
| No CI/CD pipeline visible in docs | `.github/workflows/ci.yml` exists — document it |
| No secret rotation policy | Document rotation schedule for `JWT_SECRET`, API keys |
| No rate limit configuration per route | Current global 120/min may be insufficient for some endpoints |
| `DB_SYNCHRONIZE=false` in Docker | Ensure migrations are always run before deployment |
| Webhook routes not visible | Verify Stripe/Billplz webhook controllers exist and are tested |
| No health check for workers | Terminus only checks API process; workers are separate BullMQ consumers |
