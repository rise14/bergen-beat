/**
 * Default Open Graph image — shown when a page has no specific og:image.
 * Applies to the homepage, /events, /categories, /neighborhoods, etc.
 */

import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
