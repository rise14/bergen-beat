import { MetadataRoute } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const [{ data: events }, { data: categories }, { data: neighborhoods }, { data: venueEvents }] =
    await Promise.all([
      supabase
        .from("events")
        .select("slug, updated_at")
        .eq("status", "published")
        .gte("start_date", now),
      supabase.from("categories").select("slug"),
      supabase.from("neighborhoods").select("slug"),
      supabase
        .from("events")
        .select("venue:venues(slug)")
        .eq("status", "published")
        .gte("start_date", now)
        .not("venue_id", "is", null),
    ]);

  const venueSlugs = [
    ...new Set(
      (venueEvents ?? [])
        .map((e) => (e as unknown as { venue: { slug: string } | null }).venue?.slug)
        .filter(Boolean) as string[]
    ),
  ];

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

  const venueUrls: MetadataRoute.Sitemap =
    venueSlugs.map((slug) => ({
      url: `${siteUrl}/venues/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

  return [
    { url: siteUrl,                           changeFrequency: "hourly",  priority: 1.0 },
    { url: `${siteUrl}/events`,               changeFrequency: "hourly",  priority: 0.9 },
    { url: `${siteUrl}/venues`,               changeFrequency: "daily",   priority: 0.7 },
    { url: `${siteUrl}/categories`,           changeFrequency: "weekly",  priority: 0.7 },
    { url: `${siteUrl}/neighborhoods`,        changeFrequency: "weekly",  priority: 0.7 },
    { url: `${siteUrl}/submit`,               changeFrequency: "monthly", priority: 0.4 },
    ...eventUrls,
    ...venueUrls,
    ...categoryUrls,
    ...neighborhoodUrls,
  ];
}
