import type { Metadata } from "next";
import { getActiveVenues } from "@/lib/venues";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export const metadata: Metadata = {
  title: "Event Venues",
  description: "Browse venues hosting upcoming events in Bergen County, NJ.",
  alternates: { canonical: `${siteUrl}/venues` },
  openGraph: { url: `${siteUrl}/venues` },
};

export const revalidate = 3600;

export default async function VenuesPage() {
  const venues = await getActiveVenues();

  return (
    <>
      <div className="mb-8">
        <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
          Event venues
        </h1>
        <p className="mt-4 text-gray-500">
          {venues.length} venue{venues.length !== 1 ? "s" : ""} with upcoming events in Bergen County
        </p>
      </div>

      {venues.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p>No venues with upcoming events right now.</p>
          <a href="/events" className="mt-2 inline-block text-accent-orange hover:underline">
            Browse all events →
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <a
              key={venue.id}
              href={`/venues/${venue.slug}`}
              className="group flex flex-col rounded-2xl border border-cream-200 bg-white p-5 transition hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-serif text-base font-semibold text-navy-800 group-hover:text-accent-orange transition-colors leading-snug">
                  {venue.name}
                </h2>
                <span className="shrink-0 rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium text-walnut border border-cream-200">
                  {venue.upcomingCount} event{venue.upcomingCount !== 1 ? "s" : ""}
                </span>
              </div>

              {(venue.address || venue.city) && (
                <p className="mt-2 text-sm text-gray-400 leading-snug">
                  {[venue.address, venue.city].filter(Boolean).join(", ")}
                </p>
              )}

              {venue.neighborhood && (
                <p className="mt-1 text-xs text-accent-orange font-medium">
                  {venue.neighborhood.name}
                </p>
              )}

              <p className="mt-auto pt-4 text-xs font-medium text-accent-orange">
                See upcoming events →
              </p>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
