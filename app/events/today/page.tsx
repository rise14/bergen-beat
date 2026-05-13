import type { Metadata } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { EventGrid } from "@/components/EventGrid";
import { NewsletterSubscribeBar } from "@/components/NewsletterSubscribeBar";
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from "@/lib/seo";
import type { Event } from "@/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export const metadata: Metadata = {
  title: "Things To Do Today in Bergen County, NJ",
  description:
    "Find things to do today in Bergen County, NJ — concerts, markets, outdoor activities, family events, and more happening right now. Updated daily.",
  alternates: { canonical: `${siteUrl}/events/today` },
  openGraph: {
    url: `${siteUrl}/events/today`,
    title: "Things To Do Today in Bergen County, NJ",
    description: "Concerts, markets, outdoor activities and family events happening today in Bergen County.",
  },
};

export const dynamic = "force-dynamic";

function getTodayRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const label = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    timeZone: "America/New_York",
  });

  return { start: start.toISOString(), end: end.toISOString(), label };
}

export default async function TodayPage() {
  const { start, end, label } = getTodayRange();

  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("events")
    .select(`
      id, title, slug, short_description, start_date, end_date,
      is_free, price_range, banner_url, featured, is_recurring, recurrence_note,
      category:categories(id, name, slug, icon, color),
      neighborhood:neighborhoods(id, name, slug),
      venue:venues(id, slug, name, city, lat, lng)
    `)
    .eq("status", "published")
    .gte("start_date", start)
    .lte("start_date", end)
    .order("featured", { ascending: false })
    .order("start_date", { ascending: true })
    .limit(48);

  const events = (data ?? []) as unknown as Event[];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home",   href: "/" },
    { name: "Events", href: "/events" },
    { name: "Today",  href: "/events/today" },
  ]);
  const itemList = buildItemListJsonLd(
    `Things To Do Today in Bergen County — ${label}`,
    `${siteUrl}/events/today`,
    events.map((e) => ({ name: e.title, url: `${siteUrl}/events/${e.slug}` }))
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <div className="mb-8">
        <div className="mb-1 flex flex-wrap items-baseline gap-3">
          <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
            Things To Do Today
          </h1>
          <span className="text-sm text-walnut">{label}</span>
        </div>
        <p className="mt-2 text-sm text-walnut">
          {events.length > 0
            ? `${events.length} event${events.length !== 1 ? "s" : ""} happening in Bergen County today.`
            : "Nothing listed for today yet — check back later or browse what's coming up."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/events?date=today" className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            Filter by category →
          </a>
          <a href="/events/free?date=today" className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            Free only
          </a>
          <a href="/this-weekend" className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors">
            This weekend →
          </a>
        </div>
      </div>

      {events.length > 0 ? (
        <EventGrid events={events} priorityCount={4} />
      ) : (
        <div className="py-20 text-center text-walnut/60">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-lg font-medium text-navy-800">Nothing listed for today yet.</p>
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

      <div className="mt-10">
        <NewsletterSubscribeBar variant="inline" />
      </div>
    </>
  );
}
