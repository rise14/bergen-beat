import { MetadataRoute } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { canonicalSiteUrl } from "@/lib/seo";

// Always emit the canonical www host — apex URLs redirect, and a sitemap must
// only list non-redirecting URLs.
const siteUrl = canonicalSiteUrl;

// Regenerate at most once per hour
export const revalidate = 3600;

// Events stay published (and therefore indexable) until the nightly expiry cron
// archives them 7 days after their effective end date — see
// app/api/cron/expire/route.ts. The sitemap must use the SAME retention window,
// otherwise every event in that 7-day tail is a live, internally linked,
// indexable page missing from the sitemap.
const RETENTION_DAYS = 7;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminSupabaseClient();
  const retentionCutoff = new Date(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

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
      // Mirror the expiry cron's "effective end date" rule: use end_date when
      // present, otherwise fall back to start_date.
      // Values are double-quoted: an ISO timestamp is otherwise ambiguous
      // inside PostgREST's comma/paren-delimited filter grammar.
      .or(
        `end_date.gte."${retentionCutoff}",` +
          `and(end_date.is.null,start_date.gte."${retentionCutoff}")`
      )
      .order("start_date", { ascending: true })
      .limit(5000),
    supabase.from("categories").select("slug"),
    supabase.from("neighborhoods").select("slug"),
    // NOTE: `venues` has no `updated_at` column (only `events` does), so
    // selecting it made PostgREST reject the whole query and silently return
    // null — dropping all 84 venue URLs from the sitemap. Select only columns
    // that exist.
    supabase.from("venues").select("slug").limit(2000),
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
    { url: `${siteUrl}/newsletter`,    changeFrequency: "weekly",  priority: 0.5, lastModified: today },
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
      // No per-venue timestamp available (see the select above).
      lastModified: today,
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
