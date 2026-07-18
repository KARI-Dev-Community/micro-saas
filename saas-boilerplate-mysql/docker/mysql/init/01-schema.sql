-- Auto-loaded by Docker on first boot (docker/mysql/init/01-schema.sql).
-- This is a copy of mysql/schema.sql so the local MySQL container is
-- ready to use with no manual step. If you change the schema, update
-- BOTH this file and mysql/schema.sql (or regenerate this from it).
--
-- NOTE: lib/usage.ts increments usage counters with a direct
-- INSERT ... ON DUPLICATE KEY UPDATE statement, so the increment_usage
-- stored procedure from mysql/schema.sql is not required here.
--
-- One row per user. Holds the password hash and the Stripe customer ID.
create table if not exists profiles (
  id char(36) primary key,           -- uuid v4, generated in app code
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  stripe_customer_id varchar(255) unique,
  created_at datetime(3) default current_timestamp(3)
);

-- One row per active/past subscription per user.
create table if not exists subscriptions (
  id char(36) primary key,           -- uuid v4, generated in app code
  user_id char(36) not null unique,
  payment_provider varchar(16) not null default 'stripe', -- 'stripe' | 'billplz'
  stripe_subscription_id varchar(255) unique,
  stripe_price_id varchar(255),
  billplz_bill_id varchar(255),
  status varchar(32) not null,
  amount_cents int,                   -- price in smallest currency unit, for MRR math
  currency varchar(8) default 'usd',  -- 'usd' for stripe, 'myr' for billplz
  current_period_end datetime(3),
  created_at datetime(3) default current_timestamp(3),
  foreign key (user_id) references profiles(id) on delete cascade
);

-- Generic per-user, per-feature usage counter.
create table if not exists usage_counters (
  id char(36) primary key,            -- uuid v4, generated in app code
  user_id char(36) not null,
  feature varchar(64) not null,
  period_start date not null,
  count int not null default 0,
  created_at datetime(3) default current_timestamp(3),
  unique key uq_usage (user_id, feature, period_start),
  foreign key (user_id) references profiles(id) on delete cascade
);
