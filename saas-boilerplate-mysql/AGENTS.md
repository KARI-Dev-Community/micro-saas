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

Next.js 15 (App Router, TypeScript) · MySQL (data + self-hosted email/
password auth) · Stripe + Billplz (billing) · Tailwind · Sentry ·
Upstash Redis (rate limiting) · Resend (email)

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
  (Stripe/Billplz webhooks and checkout, plus `api/projects` for the
  example Pro feature)
- `lib/` — all shared server logic: `db.ts` (mysql2 connection pool),
  `auth.ts` (self-hosted email/password sessions, server-only),
  `profile.ts` (profiles + subscriptions data access, server-only),
  `projects.ts` (example Pro-gated "projects" feature, server-only),
  `stripe.ts`, `billplz.ts`, `email.ts`, `rate-limit.ts`, `usage.ts`
- `components/` — client components, mostly buttons that call the
  `api/` routes; `projects-panel.tsx` is the example Pro feature UI
- `mysql/schema.sql` — the entire DB schema. Run manually in your MySQL
  DB (e.g. `mysql -u root -p your_db < mysql/schema.sql`); there's no
  migration tool wired up. If you add tables/columns, add the SQL here
  too, not just in a migration file elsewhere.
- Root-level `sentry.*.config.ts`, `instrumentation.ts`,
  `instrumentation-client.ts` — **exact filenames required by
  Sentry/Next.js conventions. Don't rename or move them.**

## Architecture rules — read before touching auth, billing, or data access

**Auth is self-hosted, not Supabase.** `lib/auth.ts` issues a signed JWT
(HS256, `SESSION_SECRET`) stored in an httpOnly `session` cookie. Don't
mix the two auth models: session helpers live in `lib/auth.ts`, data
access in `lib/profile.ts`, and both are server-only (`import
"server-only"`).
- `lib/auth.ts` — `getSessionUser()`, `requireSessionUser()`, `setSession()`,
  `clearSession()`, `createUser()`, `getUserByEmail()`. Use these to read
  the logged-in user from a Server Component / Route Handler. Never import
  into a Client Component.
- `lib/profile.ts` — profile + subscription reads/writes against MySQL.
  No RLS equivalent exists in this codebase (MySQL has no row-level
  security); every query runs with the app's DB credentials, so only call
  these from server code. Don't introduce a third data-access module.

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
checks the `session` cookie and redirects both for unauthenticated
users, but `/admin` has a second gate — an email allowlist
(`ADMIN_EMAILS`) checked in `app/admin/layout.tsx`, not in middleware.
If you add new protected routes, decide which pattern fits and match it
— don't invent a third auth pattern.

## Security

- Never expose `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `BILLPLZ_API_KEY`,
  or `BILLPLZ_X_SIGNATURE_KEY` to client code — they're server-only by
  convention (no `NEXT_PUBLIC_` prefix). If you add a new secret, follow
  that naming convention.
- `lib/auth.ts` and `lib/profile.ts` are marked `server-only` and read
  the DB directly (no RLS). Enforce access control in app code: only ever
  query `profiles`/`subscriptions` scoped to the authenticated `user.id`;
  don't trust a client-supplied id.
- See `.env.example` for the full list of required/optional env vars.

## Extending to multi-tenant (if needed later)

Not built. If the product needs team accounts: add an `organizations`
table and a join table (`organization_members`), then re-point
`subscriptions.user_id` to `organization_id` (billing should be
per-org, not per-user). This touches the Stripe customer creation logic
in `app/api/stripe/checkout/route.ts`, the Billplz reference field, and
every query in `lib/profile.ts` that currently filters by `user_id`.
Plan this as one deliberate migration, not an incremental patch.

## Don't

- Don't commit `.env.local` or real API keys anywhere in the repo.
- Don't add a third data-access module — `lib/auth.ts` (sessions) and
  `lib/profile.ts` (data) cover every case.
- Don't change `sentry.server.config.ts` / `sentry.edge.config.ts` /
  `instrumentation-client.ts` filenames — Sentry's Next.js SDK expects
  these exact names at the project root.
- Don't assume `npm run build` succeeding means Stripe/Billplz webhooks
  work — those need a real signing secret and a tool like the Stripe
  CLI or a manual Billplz sandbox test to verify.
