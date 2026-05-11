// This file configures Sentry for the browser (client-side).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  // Session Replay requires @sentry/nextjs >= 7.27 with the replay package.
  // Add it back once confirmed available: Sentry.replayIntegration()

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
});
