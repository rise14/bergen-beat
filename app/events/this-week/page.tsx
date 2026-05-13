import type { Metadata } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { EventGrid } from "@/components/EventGrid";
import { Pagination } from "@/components/Pagination";
import { NewsletterSubscribeBar } from "@/components/NewsletterSubscribeBar";
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from "@/lib/seo";
import type { Event } from "@/types";

const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";
const PAGE_SIZE = 24;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Things To Do This Week in Bergen County, NJ",
  description:
    "Find things to do this week in Bergen County, NJ — concerts, festivals, markets, outdoor events, kids activities, and more. Updated daily.",
  alternates: { canonical: `${siteUrl}/events/this-week` },
  openGraph: {
    url: `${siteUrl}/events/this-week`,
    title: "Things To Do This Week in Bergen County, NJ",
    description: "Concerts, festivals, markets, and more happening this week in Bergen County.",
  },
};

function getWeekRange(): { start: string; end: string; label: string } {
  const now   = new Date();
  const ny    = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York" });
  const today = new Date(ny.format(now));

  // Monday of this week
  const dayOfWeek = today.getDay(); // 0 = Sun
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMon);

  // Sunday of this week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0);
  const end   = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  return {
    start: start.toISOString(),
    end:   end.toISOString(),
    label: `${fmt(monday)} – ${fmt(sunday)}`,
  };
}

function buildHref(p: number) {
  return p > 1 ? `/events/this-week?page=${p}` : "/events/this-week";
}

interface Props {
  searchParams: { page?: string };
}

export default async function ThisWeekPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from  = (page - 1) * PAGE_SIZE;
  const to    = from + PAGE_SIZE - 1;

  const { start, end, label } = getWeekRange();

  const supabase = createAdminSupabaseClient();
  const { data, count } = await supabase
    .from("events")
    .select(`
      id, title, slug, short_description, start_date, end_date,
      is_free, price_range, banner_url, featured, is_recurring, recurrence_note,
      is_sponsored,
      category:categories(id, name, slug, icon, color),
      neighborhood:neighborhoods(id, name, slug),
      venue:venues(id, slug, name, city, lat, lng)
    `, { count: "exact" })
    .eq("status", "published")
    .gte("start_date", start)
    .lte("start_date", end)
    .order("featured", { ascending: false })
    .order("start_date", { ascending: true })
    .range(from, to);

  const events     = (data ?? []) as unknown as Event[];
  const total      = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home",      href: "/" },
    { name: "Events",    href: "/events" },
    { name: "This Week", href: "/events/this-week" },
  ]);
  const itemList = buildItemListJsonLd(
    `Things To Do This Week in Bergen County — ${label}`,
    `${siteUrl}/events/this-week`,
    events.map((e) => ({ name: e.title, url: `${siteUrl}/events/${e.slug}` }))
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <div className="mb-8">
        <div className="mb-1 flex flex-wrap items-baseline gap-3">
          <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
            This Week in Bergen County
          </h1>
          <span className="text-sm text-walnut">{label}</span>
        </div>
        <p className="mt-2 text-sm text-walnut">
          {total > 0
            ? `${total} event${total !== 1 ? "s" : ""} happening this week in Bergen County.`
            : "Nothing listed for this week yet — check back soon."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/events/this-week" className="rounded-full bg-navy-800 px-3.5 py-1.5 text-xs font-medium text-white">
            This week
          </a>
          <a href="/events/today" className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            Today
          </a>
          <a href="/this-weekend" className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            This weekend
          </a>
          <a href="/events/free" className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            Free events
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
          <p className="text-5xl mb-4">📅</p>
          <p className="text-lg font-medium text-navy-800">Nothing listed for this week yet.</p>
          <p className="mt-2 text-sm">Events are imported and submitted daily — check back soon.</p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="/this-weekend" className="rounded-full bg-accent-orange px-6 py-2.5 text-sm font-semibold text-white hover:bg-walnut transition-colors">
              This weekend →
            </a>
            <a href="/events" className="rounded-full border border-cream-200 bg-white px-6 py-2.5 text-sm font-semibold text-navy-800 hover:border-navy-800 transition-colors">
              All events
            </a>
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-10">
          <NewsletterSubscribeBar variant="inline" />
        </div>
      )}
    </>
  );
}
