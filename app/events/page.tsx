import type { Metadata } from "next";
import type { EventFilters } from "@/types";
import { EventGrid } from "@/components/EventGrid";
import { FilterBar } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
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

// Dynamic — searchParams vary per request
export const dynamic = "force-dynamic";

interface SearchParams {
  category?: string;
  neighborhood?: string;
  date?: string;
  free?: string;
  q?: string;
  page?: string;
  lat?: string;
  lng?: string;
  radius?: string;
}

interface Props {
  searchParams: SearchParams;
}

export default async function EventsPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const userLat = searchParams.lat ? parseFloat(searchParams.lat) : undefined;
  const userLng = searchParams.lng ? parseFloat(searchParams.lng) : undefined;
  const radiusMiles = searchParams.radius ? parseFloat(searchParams.radius) : undefined;

  const [result, categories, neighborhoods] = await Promise.all([
    getPublishedEvents({
      categorySlug:     searchParams.category,
      neighborhoodSlug: searchParams.neighborhood,
      dateFilter:       searchParams.date as EventFilters["dateFilter"],
      freeOnly:         searchParams.free === "true",
      query:            searchParams.q,
      page,
      userLat,
      userLng,
      radiusMiles,
    }),
    getCategories(),
    getNeighborhoods(),
  ]);

  const { events, total, totalPages, pageSize } = result;

  // Build a URL for a given page, preserving all other search params
  function buildHref(p: number): string {
    const params = new URLSearchParams();
    if (searchParams.category)     params.set("category",     searchParams.category);
    if (searchParams.neighborhood) params.set("neighborhood", searchParams.neighborhood);
    if (searchParams.date)         params.set("date",         searchParams.date);
    if (searchParams.free)         params.set("free",         searchParams.free);
    if (searchParams.q)            params.set("q",            searchParams.q);
    if (searchParams.lat)          params.set("lat",          searchParams.lat);
    if (searchParams.lng)          params.set("lng",          searchParams.lng);
    if (searchParams.radius)       params.set("radius",       searchParams.radius);
    if (p > 1)                     params.set("page",         String(p));
    const qs = params.toString();
    return `/events${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Events in Bergen County</h1>
        <p className="mt-2 text-gray-500">
          {total} event{total !== 1 ? "s" : ""} found
        </p>
      </div>

      <FilterBar
        categories={categories}
        neighborhoods={neighborhoods}
        currentFilters={searchParams}
      />

      <div className="mt-8">
        {events.length > 0 ? (
          <>
            <EventGrid events={events} priorityCount={page === 1 ? 4 : 0} />
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              buildHref={buildHref}
            />
          </>
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
