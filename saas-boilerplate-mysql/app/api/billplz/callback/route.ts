import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyBillplzSignature } from "@/lib/billplz";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReceiptEmail } from "@/lib/email";

// Billplz posts application/x-www-form-urlencoded with bracket-notation
// field names, e.g. "billplz[id]", "billplz[paid]", "billplz[x_signature]".
export async function POST(request: Request) {
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    fields[key] = String(value);
  }

  const signatureKey = "billplz[x_signature]";
  const isValid = verifyBillplzSignature(fields, signatureKey);

  if (!isValid) {
    Sentry.captureMessage("Billplz callback: invalid signature", {
      level: "warning",
      tags: { webhook: "billplz" },
      extra: { billId: fields["billplz[id]"] },
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const paid = fields["billplz[paid]"] === "true";
  const userId = fields["billplz[reference_1]"]; // set to auth user id at checkout
  const billId = fields["billplz[id]"];
  const amountCents = Number(fields["billplz[paid_amount]"] || fields["billplz[amount]"] || 0);

  if (!paid || !userId) {
    Sentry.logger.info("Billplz callback: not a completed payment", {
      billId,
      paid,
      hasUserId: Boolean(userId),
    });
    // Not a successful payment — nothing to record. Return 200 so
    // Billplz doesn't retry.
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  // Extend access by one month from now. If they still have time left on
  // a current period, this simple version doesn't stack — swap in your
  // own renewal-date math if you want unused time preserved.
  const newPeriodEnd = new Date();
  newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

  try {
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        payment_provider: "billplz",
        billplz_bill_id: billId,
        status: "active",
        amount_cents: amountCents,
        currency: "myr",
        current_period_end: newPeriodEnd.toISOString(),
      },
      { onConflict: "user_id" }
    );

    Sentry.logger.info("Billplz subscription synced", {
      userId,
      billId,
      amountCents,
    });

    const email = fields["billplz[email]"];
    if (email) {
      sendReceiptEmail(email, amountCents, "myr").catch((err) =>
        Sentry.captureException(err, {
          tags: { webhook: "billplz", stage: "receipt_email" },
        })
      );
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { webhook: "billplz", stage: "db_upsert" },
      extra: { userId, billId },
    });
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
