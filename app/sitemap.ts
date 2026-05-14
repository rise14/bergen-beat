import { MetadataRoute } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

// Regenerate at most once per hour
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const [
    { data: events },
    { data: categories },
    { data: neighborhoods },
    { data: venues },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("slug, updated_at")
      .eq("status", "published")
      .gte("start_date", now)
      .order("start_date", { ascending: true })
      .limit(5000),
    supabase.from("categories").select("slug"),
    supabase.from("neighborhoods").select("slug"),
    supabase.from("venues").select("slug, updated_at").limit(2000),
  ]);

  const today = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl,                    changeFrequency: "hourly",  priority: 1.0, lastModified: today },
    { url: `${siteUrl}/events`,        changeFrequency: "hourly",  priority: 0.9, lastModified: today },
    { url: `${siteUrl}/this-weekend`,  changeFrequency: "daily",   priority: 0.9, lastModified: today },
    { url: `${siteUrl}/venues`,        changeFrequency: "daily",   priority: 0.7, lastModified: today },
    { url: `${siteUrl}/categories`,    changeFrequency: "weekly",  priority: 0.7, lastModified: today },
    { url: `${siteUrl}/neighborhoods`, changeFrequency: "weekly",  priority: 0.7, lastModified: today },
    { url: `${siteUrl}/events/free`,    changeFrequency: "daily",   priority: 0.8, lastModified: today },
    { url: `${siteUrl}/events/today`,     changeFrequency: "hourly",  priority: 0.8, lastModified: today },
    { url: `${siteUrl}/events/this-week`, changeFrequency: "daily",   priority: 0.8, lastModified: today },
    { url: `${siteUrl}/events/kids`,   changeFrequency: "daily",   priority: 0.8, lastModified: today },
    { url: `${siteUrl}/events/outdoor`,changeFrequency: "daily",   priority: 0.8, lastModified: today },
    { url: `${siteUrl}/submit`,        changeFrequency: "monthly", priority: 0.4, lastModified: today },
    { url: `${siteUrl}/sponsor`,       changeFrequency: "monthly", priority: 0.5, lastModified: today },
    { url: `${siteUrl}/towns`,         changeFrequency: "weekly",  priority: 0.7, lastModified: today },
  ];

  const eventUrls: MetadataRoute.Sitemap =
    (events ?? []).map((e) => ({
      url: `${siteUrl}/events/${e.slug}`,
      lastModified: e.updated_at ? new Date(e.updated_at) : today,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const categoryUrls: MetadataRoute.Sitemap =
    (categories ?? []).map((c) => ({
      url: `${siteUrl}/categories/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
      lastModified: today,
    }));

  const neighborhoodUrls: MetadataRoute.Sitemap =
    (neighborhoods ?? []).map((n) => ({
      url: `${siteUrl}/neighborhoods/${n.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
      lastModified: today,
    }));

  // Town pages — same slugs, different URL structure for SEO
  const townUrls: MetadataRoute.Sitemap =
    (neighborhoods ?? []).map((n) => ({
      url: `${siteUrl}/towns/${n.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
      lastModified: today,
    }));

  const venueUrls: MetadataRoute.Sitemap =
    (venues ?? []).map((v) => ({
      url: `${siteUrl}/venues/${v.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      lastModified: v.updated_at ? new Date(v.updated_at) : today,
    }));

  return [
    ...staticPages,
    ...eventUrls,
    ...categoryUrls,
    ...neighborhoodUrls,
    ...townUrls,
    ...venueUrls,
  ];
}
