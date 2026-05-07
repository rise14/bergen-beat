"use client";

/**
 * Client component that fires a GA4 page_view event on every
 * App Router navigation (pathname change). The gtag script itself
 * is loaded once by GoogleAnalytics in the root layout.
 */

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function AnalyticsInner({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!window.gtag) return;
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    window.gtag("config", gaId, { page_path: url });
  }, [pathname, searchParams, gaId]);

  return null;
}

export function Analytics({ gaId }: { gaId: string }) {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner gaId={gaId} />
    </Suspense>
  );
}
