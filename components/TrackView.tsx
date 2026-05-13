"use client";

import { useEffect } from "react";

/**
 * Invisible client component that logs a page view for an event.
 * Place once on the event detail page. Fire-and-forget.
 */
export function TrackView({ eventId }: { eventId: string }) {
  useEffect(() => {
    fetch("/api/events/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    }).catch(() => {
      // Silently ignore — never block the page
    });
  }, [eventId]);

  return null;
}
