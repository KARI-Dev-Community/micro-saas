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
The app runs Supabase middleware on **every** request. Without these two
values it crashes with a `500` before any route runs
(`Error: Your project's URL and Key are required to create a Supabase client!`):

| Env var | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |

So the real prerequisite is **a Supabase project** (free tier is fine). Put
these in a `.env.local` file inside the variant folder.

### Required for auth/login to actually succeed
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API (server-only, secret)
- Run **`supabase/schema.sql`** in the Supabase SQL editor. There is no
  migration tool wired up, so tables like `profiles` / `subscriptions` won't
  exist until you paste it in manually.
- Add `http://localhost:3000/auth/callback` as a redirect URL in
  Supabase → Auth settings.

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

### Minimum to run without 500s
1. Node + `npm install`
2. A Supabase project
3. `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. For auth to work: add `SUPABASE_SERVICE_ROLE_KEY`, run `supabase/schema.sql`,
   and set the `/auth/callback` redirect URL

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
