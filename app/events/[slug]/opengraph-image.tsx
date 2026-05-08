/**
 * Dynamic Open Graph image for event detail pages.
 * Generated at request time by Next.js using @vercel/og (bundled with next/og).
 * Produces a 1200×630 image automatically wired into og:image meta tags.
 *
 * Falls back gracefully: if the event has a banner_url we draw it as a
 * background, otherwise we render a branded card with the event title.
 */

import { ImageResponse } from "next/og";
import { getEventBySlug } from "@/lib/events";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: { slug: string };
}

export default async function EventOGImage({ params }: Props) {
  const event = await getEventBySlug(params.slug);

  const title = event?.title ?? "Bergen Beat";
  const category = event?.category
    ? `${(event.category as { icon?: string; name: string }).icon ?? ""} ${(event.category as { icon?: string; name: string }).name}`
    : "";
  const venue = event?.venue ? (event.venue as { name: string }).name : "";
  const startDate = event?.start_date
    ? new Date(event.start_date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        timeZone: "America/New_York",
      })
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1e2d6b",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background banner image if available */}
        {event?.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.banner_url}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.25,
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(30,45,107,0.4) 0%, rgba(30,45,107,0.95) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            height: "100%",
            padding: "60px 72px",
            gap: "16px",
          }}
        >
          {/* Category pill */}
          {category && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "#c7d2fe",
                fontSize: 22,
                fontWeight: 600,
                padding: "6px 18px",
                borderRadius: 999,
                width: "fit-content",
              }}
            >
              {category}
            </div>
          )}

          {/* Title */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            {title}
          </div>

          {/* Date + venue row */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, color: "#c7d2fe", fontSize: 26 }}>
            {startDate && <span>📅 {startDate}</span>}
            {venue && <span>📍 {venue}</span>}
          </div>

          {/* Site badge */}
          <div
            style={{
              position: "absolute",
              top: 48,
              right: 72,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "white",
              fontSize: 26,
              fontWeight: 700,
              opacity: 0.9,
            }}
          >
            🎵 Bergen Beat
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
