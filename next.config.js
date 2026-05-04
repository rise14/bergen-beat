/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Supabase storage for event banner images
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Redirect bare domain to www
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
