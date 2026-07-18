# micro-saas

A collection of Next.js SaaS boilerplates — auth, billing, error tracking, and
basic ops tooling. Two variants live in this repo:

- **`saas-boilerplate-supabase/`** — Supabase (Postgres + auth) backend
- **`saas-boilerplate-mysql/`** — MySQL backend variant

Each is a standalone Next.js 15 (App Router, TypeScript) app. `cd` into the
variant you want before running any commands.

## Prerequisites

### Machine tooling
- **Node.js** ≥ 18.18 (tested on v24)
- **npm** ≥ 9 (tested on v11)

### Required to boot at all
The MySQL variant reads its DB connection settings and session secret
from env vars. Without `DATABASE_HOST`/`DATABASE_NAME` and
`SESSION_SECRET` set in `.env.local`, server routes that touch the
database will throw. The Supabase variant instead needs its project URL
and anon key (see that variant's notes).

For the **MySQL variant**, put these in a `.env.local` file inside the
variant folder:

| Env var | Where to get it |
|---|---|
| `DATABASE_HOST` / `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME` | your MySQL server |
| `SESSION_SECRET` | `openssl rand -base64 32` |

### Required for auth/login to actually succeed (MySQL variant)
- Run **`mysql/schema.sql`** against your database. There is no
  migration tool wired up, so tables like `profiles` / `subscriptions`
  won't exist until you load it manually.
- That's it — auth is self-hosted (bcrypt + a signed JWT cookie), so
  there's no external auth provider to configure.

### Optional (safe to skip in dev — these silently no-op if unset)
- **Resend** (`RESEND_API_KEY`, `EMAIL_FROM`) — welcome/receipt emails
- **Upstash Redis** (`UPSTASH_REDIS_REST_URL` / `_TOKEN`) — rate limiting
- **Stripe** (`STRIPE_*`) — subscription billing/checkout
- **Billplz** (`BILLPLZ_*`) — Malaysian payment gateway
- **Sentry** (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*`) — error tracking
- **`ADMIN_EMAILS`** — allowlist to view the `/admin` MRR dashboard

See each variant's `.env.example` for the full list of variables.

## Getting started

```bash
cd saas-boilerplate-supabase   # or saas-boilerplate-mysql

npm install                    # install dependencies
cp .env.example .env.local     # then fill in the required values above
npm run dev                    # dev server at http://localhost:3000
```

### Minimum to run without 500s (MySQL variant)
1. Node + `npm install`
2. A MySQL database (8.x or MariaDB)
3. `.env.local` with `DATABASE_*` and `SESSION_SECRET`
4. For auth to work: load `mysql/schema.sql` into your database

## Commands

```bash
npm install    # install deps
npm run dev    # dev server, localhost:3000
npm run build  # production build
npm run lint   # lint
```

There is no test suite yet.

## Notes / known issues
- `npm run build` succeeding does **not** mean Stripe/Billplz webhooks work —
  those need real signing secrets and a tool like the Stripe CLI or a Billplz
  sandbox to verify.
- A Sentry SDK version mismatch may surface as
  `'captureRouterTransitionStart' is not exported from '@sentry/nextjs'`. This
  is a dependency issue, not an env var one.
- See each variant's `AGENTS.md` for architecture rules before changing auth,
  billing, or data-access code.
