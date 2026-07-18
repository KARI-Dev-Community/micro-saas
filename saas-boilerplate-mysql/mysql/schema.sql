-- Run this in your MySQL database before starting the app.
-- (e.g. `mysql -u root -p your_db < mysql/schema.sql`, or paste into
-- your DB GUI's query editor.)
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

-- Generic per-user, per-feature usage counter. Use this for free-tier
-- caps on whatever your product ends up being — e.g. "3 projects free",
-- "10 exports/month". One row per (user, feature, period).
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

-- Atomically increments a usage counter. MySQL stored procedures can't
-- return values directly, so lib/usage.ts calls this then runs a SELECT
-- to read the updated count back.
delimiter $$

create procedure if not exists increment_usage(
  in p_user_id char(36),
  in p_feature varchar(64)
)
begin
  insert into usage_counters (id, user_id, feature, period_start, count)
    values (uuid(), p_user_id, p_feature, curdate(), 1)
  on duplicate key update count = count + 1;
end$$

delimiter ;
