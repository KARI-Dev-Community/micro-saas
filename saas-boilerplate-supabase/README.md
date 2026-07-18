# SaaS Boilerplate

Next.js (App Router) + Supabase (auth + Postgres) + Stripe (subscriptions).
Single-user, not multi-tenant — good starting point you can extend with a
`teams` table later if you need B2B accounts.

## What's included

- Email/password auth (Supabase), with session refresh in middleware
- Protected `/dashboard` route — redirects to `/login` if signed out
- Stripe Checkout for subscribing, and the Stripe customer portal for
  managing/cancelling
- Billplz as a second, cheaper payment option for Malaysian customers
  (FPX/cards/e-wallets) — see the dedicated section below
- Webhooks that keep subscription status in sync in your database for
  both providers
- `/admin` — a simple MRR dashboard (allowlisted by email), showing
  MRR, active subscriber count, and provider breakdown
- Sentry for error tracking and structured logs — catches errors in
  Server Components, Route Handlers, middleware, and the browser, plus
  logs key events in the payment webhooks
- Rate limiting (Upstash Redis) on checkout/portal routes — no-ops
  automatically if you haven't set up Redis yet
- Transactional email (Resend) — welcome email on confirmed signup,
  payment receipt on successful subscription — no-ops (just logs) if
  you haven't set up an API key yet
- SEO basics — sitemap, robots.txt, Open Graph/Twitter card metadata
- `llms.txt` and AI-crawler-aware `robots.txt` — makes the site
  readable/citable by ChatGPT Search, Claude, and Perplexity
- `AGENTS.md` + `SPEC.md` — instructions and a fill-in-the-blank spec
  template for handing this codebase to an AI coding agent once you
  have a product to build
- A generic `usage_counters` table + `checkUsageLimit()` helper for
  whenever you add a free-tier cap ("3 projects free", "10 exports/mo")
- Landing page with a pricing section, ready to swap in real copy

## 1. Install dependencies

```bash
npm install
```

## 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run everything in `supabase/schema.sql`.
3. Go to Project Settings > API and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret —
     it bypasses Row Level Security)
4. In Authentication > URL Configuration, add
   `http://localhost:3000/auth/callback` as a redirect URL (and your
   production URL later).

## 3. Set up Stripe

1. Create a product and a recurring price in the
   [Stripe Dashboard](https://dashboard.stripe.com/products) → copy the
   price ID into `STRIPE_PRICE_ID`.
2. Copy your secret key into `STRIPE_SECRET_KEY` and publishable key into
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Developers > API keys).
3. For local testing, install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
   and run:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   This prints a webhook signing secret — put it in `STRIPE_WEBHOOK_SECRET`.
4. For production, add a webhook endpoint in the Dashboard pointing to
   `https://yourdomain.com/api/stripe/webhook`, listening for
   `customer.subscription.created`, `.updated`, and `.deleted`.

**Malaysia note:** Stripe covers card payments and FPX for Malaysian
accounts, but not DuitNow QR, Touch 'n Go, Boost, ShopeePay, or local BNPL.
If you need those, look at pairing Stripe with a local processor like
HitPay or Xendit down the line — nothing here needs to change to add that
later.

## 4. Set up Billplz (optional — cheaper Malaysian gateway)

Billplz is a good fit if most of your customers are in Malaysia: flat fees
around RM0.75–1.25 per FPX transaction (Premium plan) instead of Stripe's
percentage-based card fees. Trade-off worth knowing before you rely on it:

- **Requires an SSM-registered Malaysian business.** No individual/personal
  accounts.
- **MYR only** — no currency conversion.
- **No native auto-charging subscriptions.** Billplz is built for one-off
  bills, not card-on-file recurring billing. This boilerplate handles that
  by creating a new Bill each time the user clicks "Pay with FPX" and
  extending their access by one month on successful payment. For true
  hands-off renewals, you'd need to either prompt users to pay again near
  their renewal date (e.g. an email reminder — not included, wire up your
  own email provider) or look at Billplz's Enterprise "recurring payments"
  offering, which is a separate managed product.

Setup:

1. Register at [billplz.com](https://www.billplz.com) (or test first at
   [billplz-sandbox.com](https://www.billplz-sandbox.com) — no SSM
   registration needed for sandbox).
2. Account Settings → copy your **API Key** into `BILLPLZ_API_KEY` and
   your **X Signature Key** into `BILLPLZ_X_SIGNATURE_KEY`. These are two
   different secrets — don't mix them up.
3. Create a Collection (groups your bills) and copy its ID into
   `BILLPLZ_COLLECTION_ID`.
4. Set `BILLPLZ_PLAN_AMOUNT_CENTS` to your plan price in sen
   (2900 = RM29.00).
5. Point your Billplz callback URL configuration at
   `https://yourdomain.com/api/billplz/callback` (this app also passes
   `callback_url` per-bill via the API, so dashboard-level config is a
   fallback, not strictly required).
6. Leave `BILLPLZ_SANDBOX=true` while testing; switch to `false` for
   production.

## 5. Admin MRR dashboard

Set `ADMIN_EMAILS` to a comma-separated list of emails allowed to view
`/admin`. It reads directly from the `subscriptions` table (via the
service role key, bypassing Row Level Security), so it works for both
Stripe and Billplz subscribers without any extra setup.

## 6. Set up Sentry

1. Create a free account and project at [sentry.io](https://sentry.io) —
   pick "Next.js" as the platform.
2. Copy your DSN into `NEXT_PUBLIC_SENTRY_DSN`.
3. Set `SENTRY_ORG` and `SENTRY_PROJECT` to your org/project slugs
   (visible in the project URL or Settings).
4. `SENTRY_AUTH_TOKEN` is only needed for uploading source maps (so stack
   traces show your actual code, not minified bundles) — generate one
   under Settings > Auth Tokens and set it in your CI/production
   environment, not locally.

What's wired up:
- Uncaught errors anywhere in the app (`app/global-error.tsx`) and
  specifically in `/dashboard` (`app/dashboard/error.tsx`)
- Server Components, Route Handlers, and middleware errors, via
  `instrumentation.ts`
- Structured logs from the Stripe and Billplz webhooks — signature
  failures, sync success/failure, and unmatched customers — searchable
  under Sentry's **Logs** tab
- Performance tracing (10% sample rate in production, 100% in dev —
  adjust `tracesSampleRate` in the three `sentry.*.config.ts` files as
  your traffic grows)

## 7. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the values from steps 2, 3, and 6. Rate limiting and email are
optional and safe to leave blank while you're just getting started —
see below.

## 8. Optional: rate limiting

Create a free Redis database at [upstash.com](https://upstash.com), copy
the REST URL and token into `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN`. Applies a sliding-window limit (10
requests/minute per user) to the checkout and billing-portal routes.
Leave these unset and rate limiting silently no-ops — nothing breaks.

## 9. Optional: transactional email

Create a free account at [resend.com](https://resend.com), copy your API
key into `RESEND_API_KEY`. Set `EMAIL_FROM` once you've verified a
sending domain (the default `onboarding@resend.dev` works for testing
but isn't meant for production traffic). Sends a welcome email on
confirmed signup and a receipt on successful payment. Unset, and emails
are just logged to the console instead of sent.

## 10. Usage limits (for later)

Not wired into any UI yet, since there's no product to gate. When you
add a free-tier cap, call `checkUsageLimit(userId, "your-feature", limit)`
from `lib/usage.ts` before the capped action runs — it increments a
per-user, per-month counter and tells you if they're still under the
limit.

## 11. AI crawler visibility (llms.txt + robots.txt)

Two separate decisions, both already configured with sensible defaults:

- **`public/llms.txt`** — a plain-language summary of your product, per
  the [llms.txt convention](https://llmstxt.org). Edit the placeholder
  content once you know what you're selling. Worth doing, but low-stakes:
  as of 2026 most major AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
  still crawl HTML directly rather than reading this file — treat it as
  cheap insurance, not your main lever for AI visibility.
- **`app/robots.ts`** — allows AI *search/retrieval* crawlers
  (OAI-SearchBot, Claude-SearchBot, PerplexityBot) so your product can
  show up in ChatGPT/Claude/Perplexity answers, and separately allows AI
  *training* crawlers (GPTBot, ClaudeBot, Google-Extended). These are
  different decisions — visibility vs. whether your content feeds model
  training — and you can flip either independently. If you'd rather opt
  out of training while staying visible in AI search, change the
  training-crawler rule's `allow: "/"` to `disallow: "/"`.

## 12. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`.

## 13. Building your actual product

Once you've picked and validated an idea:

1. Fill in `SPEC.md` — what you're building, MVP scope, data model,
   pricing.
2. Open the repo in an AI coding agent (Claude Code, Cursor, etc.) — it
   reads `AGENTS.md` automatically for codebase context (architecture
   gotchas, which Supabase client to use where, Billplz's billing
   limitation, and so on).
3. Ask it to build one MVP feature at a time against `SPEC.md`, rather
   than the whole thing in one prompt.

Keep both files updated as the product evolves — stale instructions
mislead an agent more than no instructions at all.

## Where to go next

- Replace the landing page copy in `app/page.tsx`
- Add your product's actual features under `app/dashboard/`
- If you need team accounts, add an `organizations` table and a join
  table linking users to orgs, then scope `subscriptions` to
  `organization_id` instead of `user_id`
- Add social login providers in Supabase Authentication settings — no
  code changes needed, the client already supports it
