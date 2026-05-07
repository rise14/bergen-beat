"use client";

/**
 * Catches errors thrown inside the root layout itself (e.g. SiteHeader crash).
 * Replaces the entire page including the layout, so it must include its own
 * <html> and <body> tags.
 */

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-white text-center font-sans">
        <p className="text-6xl font-bold" style={{ color: "#dc8f53" }}>500</p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-gray-500">
          A critical error occurred. Please try refreshing the page.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
        <div className="mt-8 flex gap-3">
          <button
            onClick={reset}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#3355ba" }}
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700"
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
