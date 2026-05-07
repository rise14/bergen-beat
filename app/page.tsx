import type { Metadata } from "next";
import type { EventFilters } from "@/types";
import { EventGrid } from "@/components/EventGrid";
import { CategoryPill } from "@/components/CategoryPill";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { getFeaturedEvents, getUpcomingEvents, getPublishedEvents } from "@/lib/events";
import { getCategories } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Bergen Beat — Events in Bergen County, NJ",
};

// Revalidate the homepage every 5 minutes
export const revalidate = 300;

const DATE_FILTERS = [
  { label: "All upcoming", value: null },
  { label: "Today", value: "today" },
  { label: "This weekend", value: "this-weekend" },
  { label: "This week", value: "this-week" },
  { label: "This month", value: "this-month" },
] as const;

const SECTION_LABELS: Record<string, string> = {
  today: "Today",
  "this-weekend": "This weekend",
  "this-week": "This week",
  "this-month": "This month",
};

interface SearchParams {
  date?: string;
}

interface Props {
  searchParams: SearchParams;
}

export default async function HomePage({ searchParams }: Props) {
  const activeDate = searchParams.date ?? null;
  const isFiltered = !!activeDate;

  const [featuredEvents, browseEvents, categories] = await Promise.all([
    getFeaturedEvents(),
    isFiltered
      ? getPublishedEvents({ dateFilter: activeDate as EventFilters["dateFilter"], limit: 12 })
      : getUpcomingEvents({ limit: 8 }),
    getCategories(),
  ]);

  const sectionLabel = isFiltered ? SECTION_LABELS[activeDate!] ?? "Events" : "Coming up";

  return (
    <>
      {/* Hero */}
      <section className="py-12 text-center">
        <h1 className="flex justify-center">
          <img
            src="/bergen-beat-logo.png"
            alt="Bergen Beat"
            className="h-auto w-full max-w-sm"
          />
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          What&apos;s happening in Bergen County, New Jersey — concerts, markets, festivals, food, and more.
        </p>
        <div className="mt-6">
          <a
            href="/events"
            className="inline-block rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Browse all events
          </a>
        </div>
      </section>

      {/* Quick date filters */}
      <section className="pb-2">
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
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </a>
            );
          })}
        </div>
      </section>

      {/* Category grid */}
      <section className="py-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
          Browse by category
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <CategoryPill key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      {/* Featured events — only show when no date filter active */}
      {!isFiltered && featuredEvents.length > 0 && (
        <section className="py-8">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Featured this week
          </h2>
          <EventGrid events={featuredEvents} />
        </section>
      )}

      {/* Upcoming / filtered events */}
      <section className="py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{sectionLabel}</h2>
            {isFiltered && (
              <p className="mt-1 text-sm text-gray-500">
                {browseEvents.length} event{browseEvents.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
          <a href="/events" className="text-sm font-medium text-brand-600 hover:underline">
            See all →
          </a>
        </div>
        {browseEvents.length > 0 ? (
          <EventGrid events={browseEvents} />
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p className="text-lg">No events found for this period.</p>
            <a href="/" className="mt-2 inline-block text-brand-600 hover:underline">
              Show all upcoming
            </a>
          </div>
        )}
      </section>

      {/* Newsletter */}
      <section className="py-12">
        <NewsletterSignup />
      </section>
    </>
  );
}
