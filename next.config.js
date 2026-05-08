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
        // Ticketmaster event images
        protocol: "https",
        hostname: "s1.ticketmaster.com",
      },
      {
        // Ticketmaster CDN (alternate subdomain)
        protocol: "https",
        hostname: "*.ticketmaster.com",
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

module.exports = nextConfig;
