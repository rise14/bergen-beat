/**
 * Dynamic Open Graph image for event detail pages.
 * Generated at request time by Next.js using @vercel/og (bundled with next/og).
 * Produces a 1200×630 PNG automatically wired into og:image meta tags.
 *
 * Layout: full-bleed banner (if available) with dark gradient overlay,
 * orange accent bar at top, Bergen Beat wordmark, event title + meta.
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

  const title    = event?.title ?? "Bergen Beat";
  const cat      = event?.category as { icon?: string; name: string; color?: string } | null;
  const venueObj = event?.venue   as { name: string; city?: string | null } | null;
  const banner   = event?.banner_url ?? null;

  const catLabel  = cat ? `${cat.icon ?? ""} ${cat.name}`.trim() : "";
  const catColor  = cat?.color ?? "#dc8f53";
  const venueStr  = venueObj ? [venueObj.name, venueObj.city].filter(Boolean).join(", ") : "";
  const priceStr  = event?.is_free ? "Free" : (event?.price_range ?? null);

  const dateStr = event?.start_date
    ? new Date(event.start_date).toLocaleDateString("en-US", {
        weekday: "short", month: "long", day: "numeric",
        timeZone: "America/New_York",
      })
    : "";

  const titleSize = title.length > 60 ? 48 : title.length > 40 ? 56 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px", height: "630px",
          display: "flex", flexDirection: "column",
          backgroundColor: "#1a2e5a",
          position: "relative", overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Full-bleed banner */}
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner} alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}

        {/* Dark gradient overlay — heavier at bottom for text legibility */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: banner
              ? "linear-gradient(to bottom, rgba(15,29,58,0.45) 0%, rgba(15,29,58,0.88) 55%, rgba(15,29,58,1) 100%)"
              : "#1a2e5a",
          }}
        />

        {/* Orange accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: "#dc8f53" }} />

        {/* Bergen Beat wordmark — top left */}
        <div
          style={{
            position: "absolute", top: "40px", left: "64px",
            display: "flex", alignItems: "center", gap: "10px",
          }}
        >
          <div
            style={{
              width: "38px", height: "38px", borderRadius: "50%",
              background: "#dc8f53", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: "19px", fontWeight: "800", color: "#fff",
            }}
          >
            B
          </div>
          <span style={{ fontSize: "22px", fontWeight: "700", color: "#fff", letterSpacing: "0.02em" }}>
            Bergen Beat
          </span>
        </div>

        {/* Category badge — top right */}
        {catLabel && (
          <div
            style={{
              position: "absolute", top: "38px", right: "64px",
              display: "flex", alignItems: "center", gap: "6px",
              background: catColor + "33", border: `1.5px solid ${catColor}88`,
              borderRadius: "9999px", padding: "7px 18px",
              color: "#fff", fontSize: "17px", fontWeight: "600",
            }}
          >
            {catLabel}
          </div>
        )}

        {/* Bottom content block */}
        <div
          style={{
            position: "absolute", bottom: "52px", left: "64px", right: "64px",
            display: "flex", flexDirection: "column", gap: "14px",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: titleSize, fontWeight: "800", color: "#ffffff",
              lineHeight: 1.12, letterSpacing: "-0.02em", maxWidth: "1020px",
            }}
          >
            {title}
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            {dateStr && (
              <span style={{ color: "#8fabd4", fontSize: "20px" }}>📅 {dateStr}</span>
            )}
            {venueStr && (
              <span style={{ color: "#8fabd4", fontSize: "20px" }}>📍 {venueStr}</span>
            )}
            {priceStr && (
              <div
                style={{
                  background: priceStr === "Free" ? "#16a34a33" : "#ffffff22",
                  border: `1px solid ${priceStr === "Free" ? "#16a34a99" : "#ffffff55"}`,
                  borderRadius: "9999px", padding: "4px 14px",
                  color: priceStr === "Free" ? "#86efac" : "#fff",
                  fontSize: "16px", fontWeight: "600",
                }}
              >
                {priceStr}
              </div>
            )}
          </div>

          {/* URL line */}
          <div style={{ color: "#4a6fa5", fontSize: "15px" }}>bergenbeat.net</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
