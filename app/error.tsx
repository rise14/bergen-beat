"use client";

/**
 * Catches runtime errors thrown inside any page or layout within the app.
 * Must be a Client Component — Next.js requires it.
 * Shown instead of the page that threw; the root layout (header/footer) is preserved.
 */

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold text-accent-orange">500</p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-gray-500">
        An unexpected error occurred. We&apos;ve been notified and will look into it.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
      )}
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-900"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
