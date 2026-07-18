import { query } from "@/lib/db";

// Server-side data access for profiles + subscriptions. There is no
// Row-Level Security anymore (MySQL has no equivalent concept here) — every
// query runs with the app's DB credentials, so only call these from
// server code (Route Handlers, Server Components, Server Actions). Never
// import this into a Client Component.

export interface Profile {
  id: string;
  email: string;
  stripe_customer_id: string | null;
}

export async function getProfileById(
  id: string
): Promise<Profile | null> {
  const [rows] = await query<Profile[]>(
    `select id, email, stripe_customer_id from profiles where id = :id limit 1`,
    { id }
  );
  return rows[0] ?? null;
}

export async function getProfileByStripeCustomerId(
  stripeCustomerId: string
): Promise<Profile | null> {
  const [rows] = await query<Profile[]>(
    `select id, email, stripe_customer_id from profiles
       where stripe_customer_id = :stripeCustomerId limit 1`,
    { stripeCustomerId }
  );
  return rows[0] ?? null;
}

export async function upsertStripeCustomerId(
  id: string,
  stripeCustomerId: string
): Promise<void> {
  await query(
    `insert into profiles (id, stripe_customer_id) values (:id, :stripeCustomerId)
       on duplicate key update stripe_customer_id = :stripeCustomerId`,
    { id, stripeCustomerId }
  );
}

export interface SubscriptionRow {
  status: string;
  current_period_end: Date | null;
  payment_provider: string | null;
  amount_cents: number | null;
  currency: string | null;
  created_at: Date | null;
}

export async function getSubscriptionByUserId(
  userId: string
): Promise<SubscriptionRow | null> {
  const [rows] = await query<SubscriptionRow[]>(
    `select status, current_period_end, payment_provider, amount_cents, currency, created_at
       from subscriptions where user_id = :userId limit 1`,
    { userId }
  );
  return rows[0] ?? null;
}

export async function getAllSubscriptions(): Promise<any[]> {
  const [rows] = await query<any[]>(
    `select user_id, payment_provider, status, amount_cents, currency,
            current_period_end, created_at
       from subscriptions
      order by created_at desc`
  );
  return rows;
}

// Upserts a subscription keyed by user_id (one active subscription per user,
// matching the `unique (user_id)` constraint on the table).
export async function upsertSubscription(
  row: Record<string, any>
): Promise<void> {
  await query(
    `insert into subscriptions
       (id, user_id, payment_provider, stripe_subscription_id, stripe_price_id,
        billplz_bill_id, status, amount_cents, currency, current_period_end)
     values
       (uuid(), :user_id, :payment_provider, :stripe_subscription_id, :stripe_price_id,
        :billplz_bill_id, :status, :amount_cents, :currency, :current_period_end)
     on duplicate key update
       payment_provider = values(payment_provider),
       stripe_subscription_id = values(stripe_subscription_id),
       stripe_price_id = values(stripe_price_id),
       billplz_bill_id = values(billplz_bill_id),
       status = values(status),
       amount_cents = values(amount_cents),
       currency = values(currency),
       current_period_end = values(current_period_end)`,
    {
      user_id: row.user_id,
      payment_provider: row.payment_provider ?? "stripe",
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      stripe_price_id: row.stripe_price_id ?? null,
      billplz_bill_id: row.billplz_bill_id ?? null,
      status: row.status,
      amount_cents: row.amount_cents ?? null,
      currency: row.currency ?? "usd",
      current_period_end: row.current_period_end ?? null,
    }
  );
}
