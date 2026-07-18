import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends a transactional email. No-ops (logs and returns) if RESEND_API_KEY
 * isn't set, so the app still runs locally without an email provider
 * configured.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!resend) {
    console.log(`[email skipped — no RESEND_API_KEY] to=${to} subject=${subject}`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    to,
    subject,
    html,
  });
}

export async function sendWelcomeEmail(to: string) {
  await sendEmail({
    to,
    subject: "Welcome!",
    html: `
      <p>Thanks for signing up — your account is confirmed and ready to go.</p>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard">Go to your dashboard</a></p>
    `,
  });
}

export async function sendReceiptEmail(
  to: string,
  amountCents: number,
  currency: string
) {
  const symbol = currency === "myr" ? "RM" : "$";
  const amount = (amountCents / 100).toFixed(2);

  await sendEmail({
    to,
    subject: "Payment received",
    html: `
      <p>We've received your payment of ${symbol}${amount}.</p>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard">View your subscription</a></p>
    `,
  });
}
