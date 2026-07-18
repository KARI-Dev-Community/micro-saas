import Stripe from "stripe";

// Lazily construct the Stripe client. Constructing it at module load throws
// when STRIPE_SECRET_KEY is unset (e.g. during `next build`'s page-data
// collection), so we only build it on first use. Stripe is optional — the
// app still runs (auth, dashboard, Billplz) without it configured.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Set it in your environment to use Stripe billing."
      );
    }
    _stripe = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      appInfo: {
        name: "saas-boilerplate",
      },
    });
  }
  return _stripe;
}
