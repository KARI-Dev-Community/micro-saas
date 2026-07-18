# Product Spec

Fill this in once you've picked and validated an idea, then hand this
file + AGENTS.md to your AI coding agent (Claude Code, Cursor, etc.) as
the starting context for building on top of the boilerplate.

Keep this updated as the product evolves — a stale spec actively
misleads an agent more than no spec at all.

---

## 1. What this product does

<!-- One paragraph. What problem does it solve, for whom, and how? -->

## 2. Target user

<!-- Who specifically pays for this? Be narrow, not "everyone". -->

## 3. Core workflow (the one thing this product must do well)

<!--
Describe the main user journey step by step, e.g.:
1. User signs up
2. User [does X]
3. Product [does Y]
4. User sees [result Z]
-->

## 4. MVP feature list

<!--
What's actually in v1. Be ruthless — cut anything not required for
the core workflow above.
-->

- [ ] Feature 1
- [ ] Feature 2

## 5. Explicitly out of scope (for now)

<!-- Prevents the agent from "helpfully" building things you don't want yet -->

-

## 6. Data model additions

<!--
What new tables/columns does this need beyond what's already in
supabase/schema.sql (profiles, subscriptions, usage_counters)?
List table name, key columns, and relationships. The agent should
add these to schema.sql in the same format as the existing tables,
including RLS policies.
-->

## 7. New routes/pages needed

<!--
List beyond what already exists (/, /login, /signup, /dashboard, /admin).
For each: purpose, protected or public, and roughly what's on it.
-->

## 8. Pricing

<!--
Plan name(s), price, what's included. Update STRIPE_PRICE_ID /
BILLPLZ_PLAN_AMOUNT_CENTS in .env.local to match, and the pricing
section on the landing page (app/page.tsx).
-->

## 9. Usage limits (if any)

<!--
If the free tier caps something, name the feature string you'll pass
to checkUsageLimit() (see lib/usage.ts) and the limit. e.g.
feature: "exports", limit: 10/month.
-->

## 10. External services beyond the boilerplate defaults

<!--
Anything this product needs that isn't already wired up — a specific
third-party API, file storage, a queue, etc. Note auth requirements
and where credentials go (.env.example).
-->

## 11. Definition of done for v1

<!--
What does "ready to launch" mean concretely? e.g. "A user can sign up,
subscribe, and [complete core workflow] end to end without errors."
-->

---

## How to use this with an AI coding agent

1. Fill in sections 1–11 above.
2. Open your agent (Claude Code, Cursor, etc.) in this repo — it should
   pick up `AGENTS.md` automatically.
3. Point it at this file: "Read SPEC.md and AGENTS.md, then build
   [section 4, feature 1]."
4. Build one MVP feature at a time, not the whole list in one prompt —
   easier to review, easier to catch the agent going off-spec early.
5. Update this file whenever the plan changes. Don't let the agent
   infer intent from stale sections.
