import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Send structured logs (Sentry.logger.*) in addition to exceptions —
  // used in the Stripe/Billplz webhook handlers to log payment events
  enableLogs: true,
});
