import type { Metadata } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { EventGrid } from "@/components/EventGrid";
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from "@/lib/seo";
import type { Event } from "@/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

/** Returns the upcoming Fri 00:00 → Sun 23:59 in ET. */
function getWeekendRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  // Convert to ET offset (EST = UTC-5, EDT = UTC-4; close enough for date math)
  const etOffset = -5 * 60;
  const utcMin = now.getTime() / 60000 + now.getTimezoneOffset();
  const etNow = new Date((utcMin + etOffset) * 60000);

  const day = etNow.getDay(); // 0=Sun … 5=Fri 6=Sat
  const daysToFriday = day === 0 ? 5 : day <= 5 ? 5 - day : 6;

  const friday = new Date(etNow);
  friday.setDate(etNow.getDate() + daysToFriday);
  friday.setHours(0, 0, 0, 0);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" });

  return { start: friday, end: sunday, label: `${fmt(friday)} – ${fmt(sunday)}` };
}

export const revalidate = 3600; // refresh hourly

export function generateMetadata(): Metadata {
  const { label } = getWeekendRange();
  return {
    title: `This Weekend in Bergen County — ${label}`,
    description:
      "Things to do this weekend in Bergen County, NJ. Concerts, markets, festivals, family events, and more — updated every week.",
    alternates: { canonical: `${siteUrl}/this-weekend` },
    openGraph: {
      url: `${siteUrl}/this-weekend`,
      title: `This Weekend in Bergen County`,
      description: `What's happening in Bergen County this weekend — ${label}`,
    },
  };
}

export default async function ThisWeekendPage() {
  const { start, end, label } = getWeekendRange();

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
    .gte("start_date", start.toISOString())
    .lte("start_date", end.toISOString())
    .order("featured", { ascending: false })
    .order("start_date", { ascending: true })
    .limit(50);

  const events = (data ?? []) as unknown as Event[];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", href: "/" },
    { name: "This Weekend", href: "/this-weekend" },
  ]);

  const itemList = buildItemListJsonLd(
    `This Weekend in Bergen County — ${label}`,
    `${siteUrl}/this-weekend`,
    events.map((e) => ({
      name: e.title,
      url: `${siteUrl}/events/${e.slug}`,
    }))
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
            This Weekend
          </h1>
          <span className="text-sm text-walnut">{label}</span>
        </div>
        <p className="mt-2 text-sm text-walnut">
          {events.length > 0
            ? `${events.length} event${events.length !== 1 ? "s" : ""} happening in Bergen County this weekend.`
            : "Check back soon — events are updated daily."}
        </p>

        {/* Quick day links */}
        <div className="mt-4 flex flex-wrap gap-2">
          {["Friday", "Saturday", "Sunday"].map((day, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dayEvents = events.filter((e) => {
              const ed = new Date(e.start_date);
              return ed.getDay() === d.getDay();
            });
            return (
              <span
                key={day}
                className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut"
              >
                {day} · {dayEvents.length}
              </span>
            );
          })}
          <a
            href="/events?date=this-weekend"
            className="rounded-full border border-cream-200 bg-white px-3.5 py-1.5 text-xs font-medium text-walnut hover:border-navy-800 hover:text-navy-800 transition-colors"
          >
            Filter by category →
          </a>
        </div>
      </div>

      {/* Events */}
      {events.length > 0 ? (
        <EventGrid events={events} priorityCount={4} />
      ) : (
        <div className="py-20 text-center text-walnut/60">
          <p className="text-5xl mb-4">🎵</p>
          <p className="text-lg font-medium text-navy-800">Nothing listed yet for this weekend.</p>
          <p className="mt-2 text-sm">Events are imported and submitted daily — check back soon.</p>
          <a href="/events" className="mt-6 inline-block rounded-full bg-accent-orange px-6 py-2.5 text-sm font-semibold text-white hover:bg-walnut transition-colors">
            Browse all upcoming events
          </a>
        </div>
      )}

      {/* Footer nudge */}
      {events.length > 0 && (
        <div className="mt-12 rounded-2xl border border-cream-200 bg-white p-6 text-center">
          <p className="text-sm text-walnut">
            Know of an event we&apos;re missing?{" "}
            <a href="/submit" className="font-semibold text-accent-orange hover:underline">
              Submit it here →
            </a>
          </p>
        </div>
      )}
    </>
  );
}
