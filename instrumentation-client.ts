// This file configures Sentry for the browser (Next.js 15+ instrumentation-client convention).
// On Next.js 14 the Sentry webpack plugin still picks this up as the client init.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://d805e13f1b714efb7b2f322c14382ef5@o4511363116367872.ingest.us.sentry.io/4511363117678592",

  tracesSampleRate: 0.1,

  // Session Replay is not available in this version of @sentry/nextjs — omitted.

  // Only capture errors in production to avoid noise during development.
  enabled: process.env.NODE_ENV === "production",
});
