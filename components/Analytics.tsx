"use client";

/**
 * GTM route tracker — pushes a page_view event to window.dataLayer on every
 * App Router navigation so GTM tags (GA4, etc.) fire on SPA route changes.
 *
 * Rendered once by GoogleTagManager in the root layout.
 */

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function GtmRouteTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dataLayer = window.dataLayer ?? [];
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    window.dataLayer.push({
      event: "page_view",
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export function GtmRouteTracker() {
  return (
    <Suspense fallback={null}>
      <GtmRouteTrackerInner />
    </Suspense>
  );
}
