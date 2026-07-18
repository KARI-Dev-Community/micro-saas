-- Run this in your Supabase project's SQL Editor
-- (Dashboard > SQL Editor > New query) before starting the app.

-- One row per user, mirrors auth.users. Holds the Stripe customer ID.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  stripe_customer_id text unique,
  created_at timestamptz default now()
);

-- One row per active/past subscription per user.
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  payment_provider text not null default 'stripe', -- 'stripe' | 'billplz'
  stripe_subscription_id text unique,
  stripe_price_id text,
  billplz_bill_id text,
  status text not null,
  amount_cents integer, -- price in smallest currency unit, for MRR math
  currency text default 'usd', -- 'usd' for stripe, 'myr' for billplz
  current_period_end timestamptz,
  created_at timestamptz default now(),
  unique (user_id)
);

-- Generic per-user, per-feature usage counter. Use this for free-tier
-- caps on whatever your product ends up being — e.g. "3 projects free",
-- "10 exports/month". One row per (user, feature, period).
create table if not exists usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  feature text not null,
  period_start date not null default date_trunc('month', now()),
  count integer not null default 0,
  created_at timestamptz default now(),
  unique (user_id, feature, period_start)
);

alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table usage_counters enable row level security;

-- Users can read their own profile and subscription row.
-- All writes go through the service role key (server-side only:
-- checkout route, webhook), so no insert/update policies are needed
-- for the anon/authenticated roles.
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can view their own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can view their own usage"
  on usage_counters for select
  using (auth.uid() = user_id);

-- Atomically increments a usage counter and returns the new count.
-- Call this from server-side code (via the RPC below) before letting a
-- user perform a capped action, then check the returned count against
-- your limit for that feature.
create or replace function public.increment_usage(
  p_user_id uuid,
  p_feature text
)
returns integer as $$
declare
  new_count integer;
begin
  insert into usage_counters (user_id, feature, period_start, count)
  values (p_user_id, p_feature, date_trunc('month', now()), 1)
  on conflict (user_id, feature, period_start)
  do update set count = usage_counters.count + 1
  returning count into new_count;

  return new_count;
end;
$$ language plpgsql security definer;

-- Automatically create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
