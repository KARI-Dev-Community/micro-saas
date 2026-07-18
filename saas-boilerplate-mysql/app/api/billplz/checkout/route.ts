import { NextResponse } from "next/server";
import { createBillplzBill } from "@/lib/billplz";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

// Billplz has no native auto-charging subscription, so this creates one
// Bill per billing cycle. The user pays it (FPX/card/e-wallet), and the
// callback route below extends their access by one period on success.
// For renewals, either have the user come back to /dashboard to pay
// again, or send a reminder email a few days before current_period_end
// (not included here — hook that into your own email provider).
export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(user.id);
  if (rateLimitResponse) return rateLimitResponse;

  const amountCents = Number(process.env.BILLPLZ_PLAN_AMOUNT_CENTS ?? 2900); // e.g. RM29.00

  try {
    const bill = await createBillplzBill({
      email: user.email,
      name: user.email.split("@")[0],
      amountCents,
      description: "Pro plan — 1 month",
      redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?billplz=redirect`,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/billplz/callback`,
      reference: user.id,
    });

    return NextResponse.json({ url: bill.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
