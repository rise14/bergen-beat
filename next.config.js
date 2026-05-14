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

  // Redirect bare domain → www
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
