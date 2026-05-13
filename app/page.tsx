import type { Metadata } from "next";
import type { EventFilters } from "@/types";
import Image from "next/image";
import { EventGrid } from "@/components/EventGrid";
import { CategoryPill } from "@/components/CategoryPill";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { getFeaturedEvents, getUpcomingEvents, getPublishedEvents } from "@/lib/events";
import { getCategories } from "@/lib/categories";
import { buildWebSiteJsonLd } from "@/lib/seo";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export const metadata: Metadata = {
  title: "Bergen Beat — Events in Bergen County, NJ",
  alternates: { canonical: siteUrl },
  openGraph: { url: siteUrl },
};

export const revalidate = 300;

const DATE_FILTERS = [
  { label: "All upcoming",  value: null },
  { label: "Today",         value: "today" },
  { label: "This weekend",  value: "this-weekend" },
  { label: "This week",     value: "this-week" },
  { label: "This month",    value: "this-month" },
] as const;

const SECTION_LABELS: Record<string, string> = {
  today:         "Today",
  "this-weekend": "This weekend",
  "this-week":   "This week",
  "this-month":  "This month",
};

interface SearchParams { date?: string; }
interface Props { searchParams: SearchParams; }

export default async function HomePage({ searchParams }: Props) {
  const activeDate = searchParams.date ?? null;
  const isFiltered = !!activeDate;

  const [featuredEvents, browseEvents, categories] = await Promise.all([
    getFeaturedEvents(),
    isFiltered
      ? getPublishedEvents({ dateFilter: activeDate as EventFilters["dateFilter"], pageSize: 12 }).then((r) => r.events)
      : getUpcomingEvents({ limit: 8 }),
    getCategories(),
  ]);

  const sectionLabel = isFiltered ? SECTION_LABELS[activeDate!] ?? "Events" : "Coming up";
  const websiteJsonLd = buildWebSiteJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      {/* ── Hero — navy card ─────────────────────────────────── */}
      <section className="-mx-4 -mt-8 bg-navy-800 px-4 pb-10 pt-12 text-center sm:-mx-6 sm:px-6">
        <h1 className="flex justify-center">
          {/* Logo: 1230×498px intrinsic, displayed at max-w-xs (320px) */}
          <Image
            src="/bergen-beat-logo.png"
            alt="Bergen Beat"
            width={320}
            height={130}
            priority
            className="h-auto w-full max-w-xs brightness-0 invert"
          />
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-sky">
          What&apos;s happening in Bergen County, NJ — concerts, markets, festivals, food, and more.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/events"
            className="rounded-full bg-accent-orange px-7 py-3 text-sm font-semibold text-white hover:bg-walnut transition-colors"
          >
            Browse all events
          </a>
          <a
            href="/submit"
            className="rounded-full border border-sky/40 px-7 py-3 text-sm font-semibold text-sky hover:border-sky hover:text-white transition-colors"
          >
            Submit an event
          </a>
        </div>
      </section>

      {/* ── Quick date filters ───────────────────────────────── */}
      <section className="pt-8 pb-2">
        <div className="flex flex-wrap gap-2">
          {DATE_FILTERS.map((f) => {
            const href = f.value ? `/?date=${f.value}` : "/";
            const isActive = activeDate === f.value;
            return (
              <a
                key={f.label}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-navy-800 text-white"
                    : "border border-cream-200 bg-white text-walnut hover:border-walnut"
                }`}
              >
                {f.label}
              </a>
            );
          })}
        </div>
      </section>

      {/* ── Category grid ────────────────────────────────────── */}
      <section className="py-8">
        <h2 className="heading-rule mb-6 text-sm font-semibold uppercase tracking-widest text-walnut">
          Browse by category
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <CategoryPill key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      {/* ── Featured events carousel ─────────────────────────── */}
      {!isFiltered && featuredEvents.length > 0 && (
        <FeaturedCarousel events={featuredEvents} />
      )}

      {/* ── Upcoming / filtered events ───────────────────────── */}
      <section className="py-8">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="heading-rule font-serif text-2xl font-semibold text-navy-800">
            {sectionLabel}
          </h2>
          <a href="/events" className="mb-3 text-sm font-medium text-accent-orange hover:underline">
            See all →
          </a>
        </div>
        {isFiltered && (
          <p className="-mt-4 mb-6 text-sm text-walnut">
            {browseEvents.length} event{browseEvents.length !== 1 ? "s" : ""} found
          </p>
        )}
        {browseEvents.length > 0 ? (
          <EventGrid events={browseEvents} priorityCount={featuredEvents.length === 0 ? 4 : 0} />
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p className="text-lg">No events found for this period.</p>
            <a href="/" className="mt-2 inline-block text-accent-orange hover:underline">
              Show all upcoming
            </a>
          </div>
        )}
      </section>

      {/* ── Newsletter ───────────────────────────────────────── */}
      <section className="py-12">
        <NewsletterSignup />
      </section>
    </>
  );
}
