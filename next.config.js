// Sentry — gracefully falls back if the package isn't installed yet.
// Run `npm install @sentry/nextjs` to enable.
let withSentryConfig;
try {
  withSentryConfig = require("@sentry/nextjs").withSentryConfig;
} catch {
  withSentryConfig = (config) => config;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve modern formats — Vercel's image pipeline handles conversion
    formats: ["image/avif", "image/webp"],

    // Breakpoints used to generate srcsets.
    // Matches the widths most useful for our grid (card ~265–384px, heroes up to 1152px).
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes:  [16, 32, 64, 128, 256, 384],

    remotePatterns: [
      {
        // Supabase storage — event banner images uploaded by admins
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Ticketmaster event images (ticketmaster.com CDN)
        protocol: "https",
        hostname: "s1.ticketmaster.com",
      },
      {
        // Ticketmaster CDN (alternate subdomain)
        protocol: "https",
        hostname: "*.ticketmaster.com",
      },
      {
        // Ticketmaster image CDN — different domain used for DAM assets
        protocol: "https",
        hostname: "s1.ticketm.net",
      },
      {
        // Ticketmaster CDN wildcard for ticketm.net
        protocol: "https",
        hostname: "*.ticketm.net",
      },
      {
        // mybergen.com event images
        protocol: "https",
        hostname: "www.mybergen.com",
      },
      {
        // Unsplash images (used as fallback banners for PredictHQ events)
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Unsplash CDN
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
    ],
  },

  // ─── Redirect bare domain → www ────────────────────────────────────────────
  // KEEP THIS RULE, but know that in production it is normally NOT the hop that
  // runs. A Cloudflare Redirect Rule sits in front of Vercel and rewrites
  // bergenbeat.net/* → https://www.bergenbeat.net/* with a 301 at the edge, so
  // the apex is resolved in ONE hop before the request ever reaches Next.js.
  //
  // This block remains as the origin-level backstop: it covers direct-to-Vercel
  // traffic (preview deployments, a bypassed/paused Cloudflare proxy) so the
  // apex never serves a 200 on the wrong host. Without the edge rule, apex
  // requests take TWO hops (http apex → https apex → https www) and Vercel
  // answers the second hop with a 307, not a 301 — which is what Ahrefs Site
  // Audit reported as "HTTP to HTTPS redirect" plus an avoidable redirect chain.
  //
  // So: do NOT "simplify" this by pointing it at a non-www destination, and do
  // not add a second competing host rule (a www→apex rule here plus the edge
  // apex→www rule is an infinite redirect loop). If you change the canonical
  // host, change it in THREE places: this rule, the Cloudflare Redirect Rule,
  // and normalizeSiteUrl() in lib/seo.ts.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "bergenbeat.net" }],
        destination: "https://www.bergenbeat.net/:path*",
        permanent: true,
      },
    ];
  },

  // ─── Security headers ──────────────────────────────────────────────────────
  // HSTS tells browsers to speak HTTPS to this host without ever trying HTTP
  // first, which removes the http:// → https:// redirect hop for repeat
  // visitors entirely (Ahrefs: "HTTP to HTTPS redirect").
  //
  //   max-age=63072000    two years, the value the preload list requires
  //   includeSubDomains   every subdomain must also be HTTPS-only
  //   preload             opts the domain in to the browser-baked preload list,
  //                       so even a FIRST-EVER visit never touches HTTP
  //
  // ⚠️ Before submitting to https://hstspreload.org, confirm that EVERY current
  // and future subdomain of bergenbeat.net can serve valid HTTPS —
  // includeSubDomains breaks any HTTP-only subdomain (staging boxes, mail
  // panels, third-party CNAMEs) with no per-host override. Preload removal is
  // slow (months, tied to browser release trains), so treat this as one-way.
  // Shipping this header alone is safe and reversible; only the hstspreload.org
  // submission is hard to undo.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry organization and project (set these in your Sentry dashboard)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress build-time Sentry output unless DEBUG is set
  silent: !process.env.CI,

  // Upload source maps to Sentry so stack traces show original code
  widenClientFileUpload: true,

  // Hide Sentry route annotation in the Next.js page tree
  hideSourceMaps: true,

  // Tree-shake Sentry debug logging out of production bundles
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
