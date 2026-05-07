import { MetadataRoute } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminSupabaseClient();

  const [{ data: events }, { data: categories }, { data: neighborhoods }] =
    await Promise.all([
      supabase
        .from("events")
        .select("slug, updated_at")
        .eq("status", "published")
        .gte("start_date", new Date().toISOString()),
      supabase.from("categories").select("slug"),
      supabase.from("neighborhoods").select("slug"),
    ]);

  const eventUrls: MetadataRoute.Sitemap =
    events?.map((e) => ({
      url: `${siteUrl}/events/${e.slug}`,
      lastModified: new Date(e.updated_at),
      changeFrequency: "daily",
      priority: 0.8,
    })) ?? [];

  const categoryUrls: MetadataRoute.Sitemap =
    categories?.map((c) => ({
      url: `${siteUrl}/categories/${c.slug}`,
      changeFrequency: "daily",
      priority: 0.6,
    })) ?? [];

  const neighborhoodUrls: MetadataRoute.Sitemap =
    neighborhoods?.map((n) => ({
      url: `${siteUrl}/neighborhoods/${n.slug}`,
      changeFrequency: "daily",
      priority: 0.6,
    })) ?? [];

  return [
    { url: siteUrl, changeFrequency: "hourly", priority: 1.0 },
    { url: `${siteUrl}/events`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${siteUrl}/categories`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/neighborhoods`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/submit`, changeFrequency: "monthly", priority: 0.4 },
    ...eventUrls,
    ...categoryUrls,
    ...neighborhoodUrls,
  ];
}
