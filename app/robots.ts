import type { MetadataRoute } from "next";
import { canonicalSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Advertise the sitemap on the canonical www host — the apex redirects.
  const siteUrl = canonicalSiteUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/organizer"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
