import { NextResponse } from "next/server";
import Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReceiptEmail } from "@/lib/email";

// Stripe requires the raw request body to verify the webhook signature,
// so this route must not run any body-parsing middleware before it.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    Sentry.captureException(err, {
      tags: { webhook: "stripe", stage: "signature_verification" },
    });
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      // Fires for both new subscriptions and any change to an existing one
      // (upgrade, downgrade, cancellation, renewal, payment failure, etc).
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profile) {
          const price = subscription.items.data[0]?.price;
          await admin.from("subscriptions").upsert(
            {
              user_id: profile.id,
              payment_provider: "stripe",
              stripe_subscription_id: subscription.id,
              stripe_price_id: price?.id,
              status: subscription.status,
              amount_cents: price?.unit_amount ?? null,
              currency: price?.currency ?? "usd",
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
            },
            { onConflict: "user_id" }
          );

          if (
            event.type === "customer.subscription.created" &&
            price?.unit_amount
          ) {
            const { data: authUser } = await admin.auth.admin.getUserById(
              profile.id
            );
            if (authUser?.user?.email) {
              sendReceiptEmail(
                authUser.user.email,
                price.unit_amount,
                price.currency
              ).catch((err) =>
                Sentry.captureException(err, {
                  tags: { webhook: "stripe", stage: "receipt_email" },
                })
              );
            }
          }

          Sentry.logger.info("Stripe subscription synced", {
            event: event.type,
            userId: profile.id,
            status: subscription.status,
          });
        } else {
          Sentry.logger.warn("Stripe webhook: no matching profile", {
            customerId,
            event: event.type,
          });
        }
        break;
      }

      default:
        // Unhandled event type — safe to ignore.
        break;
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { webhook: "stripe", stage: "event_handling" },
      extra: { eventType: event.type },
    });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
