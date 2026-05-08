import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Event } from "@/types";

export const revalidate = 3600; // regenerate every hour

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

// Escape characters that break XML
function xmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Build a single <item> block
function buildItem(event: Event): string {
  const url = `${SITE_URL}/events/${event.slug}`;
  const pubDate = new Date(event.published_at ?? event.created_at).toUTCString();
  const title = xmlEscape(event.title);

  const venue = event.venue as { name?: string; city?: string } | null;
  const venueStr = venue?.name
    ? `${venue.name}${venue.city ? `, ${venue.city}` : ""}`
    : null;

  const category = event.category as { name?: string } | null;

  // Build a plain-text description: short_description → description → fallback
  const rawDesc =
    event.short_description ??
    (event.description ? event.description.slice(0, 300) + (event.description.length > 300 ? "…" : "") : null) ??
    (venueStr ? `Event at ${venueStr}` : "Upcoming event in Bergen County, NJ.");

  const description = xmlEscape(rawDesc);

  // Date + venue line appended to description
  const eventDate = new Date(event.start_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fullDesc = xmlEscape(
    `${rawDesc}\n\nWhen: ${eventDate}${venueStr ? `\nWhere: ${venueStr}` : ""}${event.is_free ? "\nPrice: Free" : event.price_range ? `\nPrice: ${event.price_range}` : ""}`
  );

  const enclosure = event.banner_url
    ? `<enclosure url="${xmlEscape(event.banner_url)}" type="image/jpeg" length="0" />`
    : "";

  const categoryTag = category?.name
    ? `<category>${xmlEscape(category.name)}</category>`
    : "";

  return `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${fullDesc}</description>
      ${categoryTag}
      ${enclosure}
    </item>`;
}

export async function GET() {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("events")
    .select(`
      id, title, slug, description, short_description,
      start_date, end_date, is_free, price_range,
      banner_url, published_at, created_at,
      category:categories(id, name, slug, icon, color),
      venue:venues(id, slug, name, city)
    `)
    .eq("status", "published")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(50);

  const events = (data ?? []) as unknown as Event[];

  const items = events.map(buildItem).join("\n");

  const now = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Bergen Beat — Events in Bergen County, NJ</title>
    <link>${SITE_URL}</link>
    <description>Discover the best local events in Bergen County, NJ — concerts, markets, festivals, food events, and more.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/bergen-beat-logo.png</url>
      <title>Bergen Beat</title>
      <link>${SITE_URL}</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
