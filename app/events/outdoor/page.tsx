import type { Metadata } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { EventGrid } from "@/components/EventGrid";
import { Pagination } from "@/components/Pagination";
import { NewsletterSubscribeBar } from "@/components/NewsletterSubscribeBar";
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from "@/lib/seo";
import type { Event } from "@/types";

const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
const PAGE_SIZE = 24;

// Slugs to match — covers however outdoor/nature was named in the DB
const OUTDOOR_SLUGS = [
  "outdoor", "outdoors", "nature", "parks", "hiking",
  "outdoor-events", "nature-outdoors", "park", "outdoor-recreation",
];

export const metadata: Metadata = {
  title: "Outdoor Events in Bergen County, NJ",
  description:
    "Outdoor events in Bergen County, NJ — hikes, nature walks, park festivals, farmers markets, outdoor concerts, and more. Find things to do outside in Bergen County.",
  alternates: { canonical: `${siteUrl}/events/outdoor` },
  openGraph: {
    url: `${siteUrl}/events/outdoor`,
    title: "Outdoor Events in Bergen County, NJ",
    description: "Hikes, nature walks, park festivals, outdoor concerts, and more in Bergen County.",
  },
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { page?: string };
}

function buildHref(p: number) {
  return p > 1 ? `/events/outdoor?page=${p}` : "/events/outdoor";
}

export default async function OutdoorEventsPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from  = (page - 1) * PAGE_SIZE;
  const to    = from + PAGE_SIZE - 1;

  const supabase = createAdminSupabaseClient();

  // Resolve outdoor/nature category IDs
  const { data: cats } = await supabase
    .from("categories")
    .select("id")
    .in("slug", OUTDOOR_SLUGS);

  const catIds = (cats ?? []).map((c) => c.id);

  let query = supabase
    .from("events")
    .select(`
      id, title, slug, short_description, start_date, end_date,
      is_free, price_range, banner_url, featured, is_recurring, recurrence_note,
      category:categories(id, name, slug, icon, color),
      neighborhood:neighborhoods(id, name, slug),
      venue:venues(id, slug, name, city, lat, lng)
    `, { count: "exact" })
    .eq("status", "published")
    .gte("start_date", new Date().toISOString())
    .order("featured", { ascending: false })
    .order("start_date", { ascending: true })
    .range(from, to);

  if (catIds.length > 0) {
    query = catIds.length === 1
      ? query.eq("category_id", catIds[0])
      : query.in("category_id", catIds);
  }

  const { data, count } = await query;
  const events     = (data ?? []) as unknown as Event[];
  const total      = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home",    href: "/" },
    { name: "Events",  href: "/events" },
    { name: "Outdoor", href: "/events/outdoor" },
  ]);
  const itemList = buildItemListJsonLd(
    "Outdoor Events in Bergen County, NJ",
    `${siteUrl}/events/outdoor`,
    events.map((e) => ({ name: e.title, url: `${siteUrl}/events/${e.slug}` }))
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <div className="mb-8">
        <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
          Outdoor Events
        </h1>
        <p className="mt-2 text-sm text-walnut">
          {total > 0
            ? `${total} outdoor event${total !== 1 ? "s" : ""} coming up in Bergen County.`
            : "Check back soon — outdoor events are added daily."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/events/outdoor" className="rounded-full bg-navy-800 px-3.5 py-1.5 text-xs font-medium text-white">
            All outdoor
          </a>
          <a href="/events/outdoor?page=1" className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            This weekend
          </a>
          <a href="/events/free" className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            Free events
          </a>
          <a href="/events/kids" className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            Kids &amp; family
          </a>
        </div>
      </div>

      {events.length > 0 ? (
        <>
          <EventGrid events={events} priorityCount={page === 1 ? 4 : 0} />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} buildHref={buildHref} />
        </>
      ) : (
        <div className="py-20 text-center text-walnut/60">
          <p className="text-5xl mb-4">🌿</p>
          <p className="text-lg font-medium text-navy-800">No outdoor events listed right now.</p>
          <p className="mt-2 text-sm">Events are imported and submitted daily — check back soon.</p>
          <a href="/events" className="mt-6 inline-block rounded-full bg-accent-orange px-6 py-2.5 text-sm font-semibold text-white hover:bg-walnut transition-colors">
            Browse all events
          </a>
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-10 space-y-4">
          <NewsletterSubscribeBar variant="inline" />
          <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center">
            <p className="text-sm font-medium text-navy-800">Hosting an outdoor event?</p>
            <p className="mt-1 text-sm text-walnut">
              List it free — hikes, markets, festivals, and park events are always welcome.{" "}
              <a href="/submit" className="font-semibold text-accent-orange hover:underline">Submit your event →</a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
