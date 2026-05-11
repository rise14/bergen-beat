import type { Metadata } from "next";
import type { EventFilters } from "@/types";
import { EventGrid } from "@/components/EventGrid";
import { FilterBar } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { EventsMapView } from "@/components/EventsMapView";
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

export const dynamic = "force-dynamic";

interface SearchParams {
  category?: string;
  neighborhood?: string;
  date?: string;
  free?: string;
  outside?: string;
  q?: string;
  page?: string;
  lat?: string;
  lng?: string;
  radius?: string;
  view?: string;
}

interface Props {
  searchParams: SearchParams;
}

export default async function EventsPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const isMapView = searchParams.view === "map";

  const userLat = searchParams.lat ? parseFloat(searchParams.lat) : undefined;
  const userLng = searchParams.lng ? parseFloat(searchParams.lng) : undefined;
  const radiusMiles = searchParams.radius ? parseFloat(searchParams.radius) : undefined;

  const [result, categories, neighborhoods] = await Promise.all([
    getPublishedEvents({
      categorySlug:     searchParams.category,
      neighborhoodSlug: searchParams.neighborhood,
      dateFilter:       searchParams.date as EventFilters["dateFilter"],
      freeOnly:         searchParams.free === "true",
      outsideBergen:    searchParams.outside === "true",
      query:            searchParams.q,
      // Map view fetches more events (no pagination needed)
      page:             isMapView ? 1 : page,
      pageSize:         isMapView ? 200 : undefined,
      userLat,
      userLng,
      radiusMiles,
    }),
    getCategories(),
    getNeighborhoods(),
  ]);

  const { events, total, totalPages, pageSize } = result;

  function buildHref(p: number): string {
    const params = new URLSearchParams();
    if (searchParams.category)     params.set("category",     searchParams.category);
    if (searchParams.neighborhood) params.set("neighborhood", searchParams.neighborhood);
    if (searchParams.date)         params.set("date",         searchParams.date);
    if (searchParams.free)         params.set("free",         searchParams.free);
    if (searchParams.outside)      params.set("outside",      searchParams.outside);
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
      <div className="mb-6">
        <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
          Events in Bergen County
        </h1>
        <p className="mt-2 text-sm text-walnut">
          {total} event{total !== 1 ? "s" : ""} found
        </p>
      </div>

      <FilterBar
        categories={categories}
        neighborhoods={neighborhoods}
        currentFilters={searchParams}
        showViewToggle
      />

      <div className="mt-8">
        {isMapView ? (
          /* ── Map view ── */
          <EventsMapView events={events} />
        ) : events.length > 0 ? (
          /* ── List view ── */
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
          <div className="py-16 text-center text-walnut/60">
            <p className="text-lg">No events match your filters.</p>
            <a href="/events" className="mt-2 inline-block text-accent-orange hover:underline">
              Clear filters
            </a>
          </div>
        )}
      </div>
    </>
  );
}
