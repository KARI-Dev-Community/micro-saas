import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSessionUser } from "@/lib/auth";
import { getProfileById } from "@/lib/profile";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(user.id);
  if (rateLimitResponse) return rateLimitResponse;

  const profile = await getProfileById(user.id);
  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  });

  return NextResponse.json({ url: portalSession.url });
}
