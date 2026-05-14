import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  // Only capture errors in production to avoid noise during development.
  enabled: process.env.NODE_ENV === "production",
});

// Required by Sentry to instrument client-side navigations in Next.js App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
