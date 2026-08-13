/**
 * Default Open Graph image — the branded 1200×630 Bergen Beat card.
 *
 * Next.js resolves `opengraph-image.tsx` per route segment: the generated image
 * is attached to the segment the file lives in, and is NOT inherited by nested
 * segments once those declare their own `openGraph` metadata object. That's why
 * every segment which needs the default card re-exports this component from its
 * own `opengraph-image.tsx` (a one-liner), rather than relying on app/.
 *
 * Event detail pages are the exception: they have their own dynamic OG image at
 * app/events/[slug]/opengraph-image.tsx.
 */

import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Bergen Beat — Events in Bergen County, NJ";

export default function DefaultOGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1e2d6b",
          backgroundImage: "radial-gradient(circle at 30% 50%, #3355ba 0%, #1e2d6b 60%)",
        }}
      >
        <div style={{ fontSize: 96, marginBottom: 16 }}>🎵</div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.03em",
          }}
        >
          Bergen Beat
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 30,
            color: "#c7d2fe",
            fontWeight: 400,
          }}
        >
          Events in Bergen County, NJ
        </div>
      </div>
    ),
    { ...size }
  );
}
