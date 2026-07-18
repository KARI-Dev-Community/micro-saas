import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSessionUser } from "@/lib/auth";
import {
  getProfileById,
  upsertStripeCustomerId,
} from "@/lib/profile";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(user.id);
  if (rateLimitResponse) return rateLimitResponse;

  // Reuse an existing Stripe customer if we already created one for this
  // user, otherwise create one now and store it.
  const stripe = getStripe();
  const profile = await getProfileById(user.id);
  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { app_user_id: user.id },
    });
    customerId = customer.id;

    await upsertStripeCustomerId(user.id, customerId);
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
