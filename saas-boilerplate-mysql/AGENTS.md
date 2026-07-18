# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Codex, Copilot,
etc.) working in this repository. Read this before making changes.

## What this is

A Next.js SaaS boilerplate — auth, billing, error tracking, and basic
ops tooling, not tied to any specific product yet. If a real product
has been built on top of this, **update the "What this is" section
above with what it actually does** — don't leave this generic.

Single-user architecture (not multi-tenant/teams). If you're adding
team/organization support, see "Extending to multi-tenant" below before
you start — it touches the schema, RLS policies, and Stripe customer
model.

## Stack

Next.js 15 (App Router, TypeScript) · Supabase (Postgres + auth) ·
Stripe + Billplz (billing) · Tailwind · Sentry · Upstash Redis (rate
limiting) · Resend (email)

## Commands

```bash
npm install        # install deps
npm run dev         # dev server, localhost:3000
npm run build        # production build
npm run lint         # lint
```

No test suite exists yet. If you add one, use Vitest for unit tests and
Playwright for webhook/e2e flows — update this file with the run
command once you do.

## Directory map

- `app/` — routes. `(auth)/` = login/signup, `dashboard/` = protected
  user area, `admin/` = protected MRR dashboard, `api/` = route handlers
  (Stripe/Billplz webhooks and checkout, no other API routes exist yet)
- `lib/` — all shared server logic: `supabase/` (three clients, see
  below), `stripe.ts`, `billplz.ts`, `email.ts`, `rate-limit.ts`,
  `usage.ts`
- `components/` — client components, mostly buttons that call the
  `api/` routes
- `supabase/schema.sql` — the entire DB schema. Run manually in the
  Supabase SQL editor; there's no migration tool wired up. If you add
  tables/columns, add the SQL here too, not just in a migration file
  elsewhere.
- Root-level `sentry.*.config.ts`, `instrumentation.ts`,
  `instrumentation-client.ts` — **exact filenames required by
  Sentry/Next.js conventions. Don't rename or move them.**

## Architecture rules — read before touching auth, billing, or data access

**Three Supabase clients exist for a reason — don't cross them:**
- `lib/supabase/client.ts` — browser, respects RLS, use in Client
  Components only
- `lib/supabase/server.ts` — server, respects RLS, use in Server
  Components/Route Handlers where a user session exists
- `lib/supabase/admin.ts` — **service role key, bypasses RLS entirely.**
  Server-only. Only use where there's no user session to scope to
  (webhooks) or for admin-only reads (`/admin`). Never import this in
  anything that runs client-side.

**Billplz has no native auto-charging subscription.** The checkout
route creates one Bill per billing cycle; the callback extends
`current_period_end` by exactly one month on payment. There is no
mechanism that automatically bills the user again — that requires
either a reminder email flow (not built) or moving to Billplz's
separate Enterprise recurring product. Don't assume Billplz
subscriptions "renew" the way Stripe ones do.

**`subscriptions.amount_cents` + `currency` are per-row, not global.**
Stripe rows are typically `usd`, Billplz rows are always `myr`. Never
sum `amount_cents` across rows without grouping by `currency` first —
the admin MRR dashboard (`app/admin/page.tsx`) already does this
correctly; copy that pattern, don't re-sum naively.

**Rate limiting and email silently no-op if unconfigured.** `lib/
rate-limit.ts` and `lib/email.ts` both check for their respective env
vars and skip (not error) if unset. This is intentional for local dev —
don't "fix" it by making them throw, and don't assume they're active in
an environment without checking the env vars are actually set.

**`usage_counters` table + `checkUsageLimit()` exist but nothing calls
them yet.** This is scaffolding for whenever a free-tier cap gets added
to a real feature. Before wiring it in: confirm the `feature` string
you're using is unique and matches what you'll query later — there's
no registry of feature names, just convention.

**Stripe webhook needs the raw request body** for signature
verification (`request.text()`, not `request.json()`). Don't add body-
parsing middleware in front of `app/api/stripe/webhook/route.ts`.

**Billplz signature verification is order/case sensitive** — see the
comment in `lib/billplz.ts`. Field names arrive with bracket notation
(`billplz[id]`) and must be passed through exactly as received; don't
strip the brackets before verifying.

**`/dashboard` and `/admin` are gated differently.** `middleware.ts`
blocks both for unauthenticated users, but `/admin` has a second gate —
an email allowlist (`ADMIN_EMAILS`) checked in `app/admin/layout.tsx`,
not in middleware. If you add new protected routes, decide which
pattern fits and match it — don't invent a third auth pattern.

## Security

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
  `BILLPLZ_API_KEY`, or `BILLPLZ_X_SIGNATURE_KEY` to client code —
  they're server-only by convention (no `NEXT_PUBLIC_` prefix). If you
  add a new secret, follow that naming convention.
- Row Level Security is the primary access control on `profiles`,
  `subscriptions`, and `usage_counters`. If you add a table with user
  data, add RLS policies in the same SQL block — don't rely on
  application-level checks alone.
- See `.env.example` for the full list of required/optional env vars.

## Extending to multi-tenant (if needed later)

Not built. If the product needs team accounts: add an `organizations`
table and a join table (`organization_members`), then re-point
`subscriptions.user_id` to `organization_id` (billing should be
per-org, not per-user). This touches the Stripe customer creation logic
in `app/api/stripe/checkout/route.ts`, the Billplz reference field, and
every RLS policy that currently checks `auth.uid() = user_id`. Plan
this as one deliberate migration, not an incremental patch.

## Don't

- Don't commit `.env.local` or real API keys anywhere in the repo.
- Don't add a fourth Supabase client — the three above cover every
  case.
- Don't change `sentry.server.config.ts` / `sentry.edge.config.ts` /
  `instrumentation-client.ts` filenames — Sentry's Next.js SDK expects
  these exact names at the project root.
- Don't assume `npm run build` succeeding means Stripe/Billplz webhooks
  work — those need a real signing secret and a tool like the Stripe
  CLI or a manual Billplz sandbox test to verify.
