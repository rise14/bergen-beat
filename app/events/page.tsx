import type { Metadata } from "next";
import type { EventFilters } from "@/types";
import { EventGrid } from "@/components/EventGrid";
import { FilterBar } from "@/components/FilterBar";
import { getPublishedEvents } from "@/lib/events";
import { getCategories } from "@/lib/categories";
import { getNeighborhoods } from "@/lib/neighborhoods";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export const metadata: Metadata = {
  title: "All Events",
  description:
    "Browse all upcoming events in Bergen County, NJ. Filter by category, neighborhood, date, and more.",
  alternates: { canonical: `${siteUrl}/events` },
  openGraph: { url: `${siteUrl}/events` },
};

export const revalidate = 3600;

interface SearchParams {
  category?: string;
  neighborhood?: string;
  date?: string;       // "today" | "this-weekend" | "this-week" | "this-month"
  free?: string;       // "true"
  q?: string;          // search query
}

interface Props {
  searchParams: SearchParams;
}

export default async function EventsPage({ searchParams }: Props) {
  const [events, categories, neighborhoods] = await Promise.all([
    getPublishedEvents({
      categorySlug: searchParams.category,
      neighborhoodSlug: searchParams.neighborhood,
      dateFilter: searchParams.date as EventFilters["dateFilter"],
      freeOnly: searchParams.free === "true",
      query: searchParams.q,
    }),
    getCategories(),
    getNeighborhoods(),
  ]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Events in Bergen County</h1>
        <p className="mt-2 text-gray-500">
          {events.length} event{events.length !== 1 ? "s" : ""} found
        </p>
      </div>

      <FilterBar
        categories={categories}
        neighborhoods={neighborhoods}
        currentFilters={searchParams}
      />

      <div className="mt-8">
        {events.length > 0 ? (
          <EventGrid events={events} />
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p className="text-lg">No events match your filters.</p>
            <a href="/events" className="mt-2 inline-block text-brand-600 hover:underline">
              Clear filters
            </a>
          </div>
        )}
      </div>
    </>
  );
}
