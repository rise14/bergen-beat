import type { Metadata } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { EventGrid } from "@/components/EventGrid";
import { Pagination } from "@/components/Pagination";
import { NewsletterSubscribeBar } from "@/components/NewsletterSubscribeBar";
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from "@/lib/seo";
import type { Event } from "@/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
const PAGE_SIZE = 24;

export const metadata: Metadata = {
  title: "Free Events in Bergen County, NJ",
  description:
    "Discover free things to do in Bergen County, NJ — free concerts, outdoor movies, festivals, farmers markets, family events, and more. Updated daily.",
  alternates: { canonical: `${siteUrl}/events/free` },
  openGraph: {
    url: `${siteUrl}/events/free`,
    title: "Free Events in Bergen County, NJ",
    description:
      "Free concerts, festivals, markets, outdoor movies, and family events happening in Bergen County. No ticket required.",
  },
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { page?: string };
}

function buildHref(p: number): string {
  return p > 1 ? `/events/free?page=${p}` : "/events/free";
}

export default async function FreeEventsPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  const supabase = createAdminSupabaseClient();

  const { data, count } = await supabase
    .from("events")
    .select(`
      id, title, slug, short_description, start_date, end_date,
      is_free, price_range, banner_url, featured, is_recurring, recurrence_note, is_sponsored,
      category:categories(id, name, slug, icon, color),
      neighborhood:neighborhoods(id, name, slug),
      venue:venues(id, slug, name, city, lat, lng)
    `, { count: "exact" })
    .eq("status", "published")
    .eq("is_free", true)
    .gte("start_date", new Date().toISOString())
    .order("featured", { ascending: false })
    .order("start_date", { ascending: true })
    .range(from, to);

  const events  = (data ?? []) as unknown as Event[];
  const total   = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home",   href: "/" },
    { name: "Events", href: "/events" },
    { name: "Free Events", href: "/events/free" },
  ]);

  const itemList = buildItemListJsonLd(
    "Free Events in Bergen County, NJ",
    `${siteUrl}/events/free`,
    events.map((e) => ({ name: e.title, url: `${siteUrl}/events/${e.slug}` }))
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
          Free Events in Bergen County
        </h1>
        <p className="mt-2 text-sm text-walnut">
          {total > 0
            ? `${total} free event${total !== 1 ? "s" : ""} coming up — no ticket required.`
            : "Check back soon — free events are added daily."}
        </p>

        {/* Filter chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/events/free?page=1"
            className="rounded-full bg-navy-800 px-3.5 py-1.5 text-xs font-medium text-white"
          >
            All free events
          </a>
          <a
            href="/events?free=true&date=today"
            className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors"
          >
            Free today
          </a>
          <a
            href="/events?free=true&date=this-weekend"
            className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors"
          >
            Free this weekend
          </a>
          <a
            href="/events?free=true&date=this-week"
            className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors"
          >
            Free this week
          </a>
        </div>
      </div>

      {/* Events */}
      {events.length > 0 ? (
        <>
          <EventGrid events={events} priorityCount={page === 1 ? 4 : 0} />
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            buildHref={buildHref}
          />
        </>
      ) : (
        <div className="py-20 text-center text-walnut/60">
          <p className="text-5xl mb-4">🎟️</p>
          <p className="text-lg font-medium text-navy-800">No free events listed right now.</p>
          <p className="mt-2 text-sm">Check back soon — events are imported and submitted daily.</p>
          <a
            href="/events"
            className="mt-6 inline-block rounded-full bg-accent-orange px-6 py-2.5 text-sm font-semibold text-white hover:bg-walnut transition-colors"
          >
            Browse all upcoming events
          </a>
        </div>
      )}

      {/* Footer nudges */}
      {events.length > 0 && (
        <div className="mt-12 space-y-4">
          <NewsletterSubscribeBar variant="inline" />
          <div className="rounded-2xl border border-cream-200 bg-white p-6 text-center">
            <p className="text-sm font-medium text-navy-800">Running a free event?</p>
            <p className="mt-1 text-sm text-walnut">
              Get it in front of Bergen County locals — it&apos;s free to list.{" "}
              <a href="/submit" className="font-semibold text-accent-orange hover:underline">
                Submit your event →
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
