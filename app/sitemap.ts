import { MetadataRoute } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { canonicalSiteUrl } from "@/lib/seo";
import { getActiveVenueSlugs } from "@/lib/venues";
import { isHiddenFromListings } from "@/lib/events";

// Always emit the canonical www host — apex URLs redirect, and a sitemap must
// only list non-redirecting URLs.
const siteUrl = canonicalSiteUrl;

// Regenerate at most once every 5 minutes.
//
// This is NOT arbitrary: app/events/[slug]/page.tsx is a separate ISR cache
// entry with its own independent expiry clock, and the `start_date < now`
// boundary is evaluated at render time, not request time. At revalidate=3600
// the two bodies could disagree for up to an hour — the sitemap still listing
// an event whose detail page had already flipped to `noindex`, which Ahrefs
// Site Audit flagged as "Noindex page in sitemap" (Critical,
// c64d53a0-d0f4-11e7-8ed1-001e67ed4656). Shorter window = smaller disagreement.
// The query below is ~128 rows, so regenerating more often is cheap.
export const revalidate = 300;

// A sitemap must list the pages we want indexed — which is the set of pages the
// site actually links to.
//
// This used to mirror the expiry cron's 7-day retention window, on the reasoning
// that an event in that tail is "a live, internally linked, indexable page". The
// premise was wrong: events are NOT internally linked in that tail. Every public
// listing query filters `.gte("start_date", now)` (see lib/events.ts →
// isHiddenFromListings), so a past event drops out of every grid and related-
// events block immediately, while staying published for 7 more days. Listing all
// of them here advertised 431 link-unreachable URLs, which Ahrefs Site Audit
// flagged as "Orphan page (has no incoming internal links)" (Critical).
//
// So the sitemap window now matches the LISTING window, not the retention
// window: only events still visible somewhere on the site. Past events remain
// reachable by direct link for the 7-day tail — they're just no longer
// advertised for indexing, and app/events/[slug]/page.tsx marks them noindex.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminSupabaseClient();
  const listingCutoff = new Date().toISOString();

  const [
    { data: events },
    { data: categories },
    { data: neighborhoods },
    venues,
  ] = await Promise.all([
    supabase
      .from("events")
      // `start_date` is selected so the render-time filter below can reuse
      // isHiddenFromListings — the same function the detail page keys `noindex` off.
      .select("slug, updated_at, start_date")
      .eq("status", "published")
      // Same predicate the listings use, so the sitemap can't drift from what
      // the site links to.
      .gte("start_date", listingCutoff)
      .order("start_date", { ascending: true })
      .limit(5000),
    supabase.from("categories").select("slug"),
    supabase.from("neighborhoods").select("slug"),
    // Venues, restricted to those with upcoming events — the same set /venues
    // links to (lib/venues.ts → getActiveVenues filters upcomingCount > 0).
    // Selecting every venue row advertised 265 URLs that nothing links to and
    // that render an empty "No upcoming events at this venue" state.
    //
    // NOTE: `venues` has no `updated_at` column (only `events` does), so
    // selecting it made PostgREST reject the whole query and silently return
    // null — dropping all 84 venue URLs from the sitemap. Select only columns
    // that exist.
    getActiveVenueSlugs(),
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
    (events ?? [])
      // Belt-and-braces: the .gte() above bounds the query at fetch time, but a
      // cached sitemap body outlives that instant. Re-checking through the shared
      // predicate means an event that expired since the fetch can never be
      // advertised as indexable, however stale this cache entry is.
      .filter((e) => !isHiddenFromListings(e))
      .map((e) => ({
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
    (venues ?? []).map((slug) => ({
      url: `${siteUrl}/venues/${slug}`,
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
