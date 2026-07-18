import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% in dev, 10% in production — adjust based on traffic
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

// Instruments client-side route changes for tracing. `captureRouterTransitionStart`
// only exists on newer Sentry SDKs; fall back gracefully on older versions.
export const onRouterTransitionStart =
  (Sentry as any).captureRouterTransitionStart ?? (() => {});
