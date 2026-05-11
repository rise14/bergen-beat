// instrumentation.ts — loaded once on server startup by Next.js.
// onRequestError is a Next.js 15+ API so we omit it here (app is on Next.js 14).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
