import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVenueBySlug, getVenueEvents, getActiveVenueSlugs } from "@/lib/venues";
import { buildBreadcrumbJsonLd, buildPlaceJsonLd, buildItemListJsonLd } from "@/lib/seo";
import { EventGrid } from "@/components/EventGrid";
import { EventMap } from "@/components/EventMap";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await getActiveVenueSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const venue = await getVenueBySlug(params.slug);
  if (!venue) return {};

  const title = venue.city ? `${venue.name}, ${venue.city}` : venue.name;
  const description = `Upcoming events at ${venue.name}${venue.city ? ` in ${venue.city}` : ""}, Bergen County, NJ.`;
  const canonicalUrl = `${siteUrl}/venues/${venue.slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { url: canonicalUrl },
  };
}

export default async function VenuePage({ params }: Props) {
  const [venue, events] = await Promise.all([
    getVenueBySlug(params.slug),
    getVenueBySlug(params.slug).then((v) => v ? getVenueEvents(v.id) : []),
  ]);

  if (!venue) notFound();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home",   href: "/" },
    { name: "Venues", href: "/venues" },
    { name: venue.name, href: `/venues/${venue.slug}` },
  ]);

  const placeJsonLd = buildPlaceJsonLd({
    name: venue.city ? `${venue.name}, ${venue.city}` : venue.name,
    url: `${siteUrl}/venues/${venue.slug}`,
    description: `Upcoming events at ${venue.name}${venue.city ? ` in ${venue.city}` : ""}, Bergen County, NJ.`,
    address: {
      streetAddress:   venue.address  ?? undefined,
      addressLocality: venue.city     ?? undefined,
      addressRegion:   venue.state    ?? "NJ",
      postalCode:      venue.zip      ?? undefined,
    },
    geo: venue.lat && venue.lng ? { lat: venue.lat, lng: venue.lng } : undefined,
    website: venue.website ?? undefined,
  });

  const eventListJsonLd = events.length > 0
    ? buildItemListJsonLd(
        `Events at ${venue.name}`,
        `${siteUrl}/venues/${venue.slug}`,
        events.slice(0, 10).map((e) => ({
          name: e.title,
          url: `/events/${e.slug}`,
          ...(e.short_description ? { description: e.short_description } : {}),
          ...(e.banner_url ? { image: e.banner_url } : {}),
        }))
      )
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />
      {eventListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventListJsonLd) }}
        />
      )}

      {/* Back link */}
      <a href="/venues" className="text-sm text-gray-400 hover:text-gray-600">
        ← All venues
      </a>

      {/* Header */}
      <div className="mt-4 mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
            {venue.name}
          </h1>
          {(venue.address || venue.city) && (
            <p className="mt-4 text-gray-500">
              {[venue.address, venue.city, venue.state].filter(Boolean).join(", ")}
              {venue.zip ? ` ${venue.zip}` : ""}
            </p>
          )}
          {venue.neighborhood && (
            <a
              href={`/neighborhoods/${venue.neighborhood.slug}`}
              className="mt-1 inline-block text-sm font-medium text-accent-orange hover:underline"
            >
              {venue.neighborhood.name}
            </a>
          )}
        </div>
        {venue.website && (
          <a
            href={venue.website}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full border border-cream-200 px-4 py-2 text-sm font-medium text-walnut hover:border-walnut transition-colors"
          >
            Visit website →
          </a>
        )}
      </div>

      {/* Map */}
      {venue.lat && venue.lng && (
        <div className="mb-10 overflow-hidden rounded-2xl">
          <EventMap lat={venue.lat} lng={venue.lng} label={venue.name} />
        </div>
      )}

      {/* Events */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="heading-rule font-serif text-2xl font-semibold text-navy-800">
            Upcoming events
          </h2>
          <span className="mb-3 text-sm text-walnut">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>

        {events.length > 0 ? (
          <EventGrid events={events} />
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p>No upcoming events at this venue.</p>
            <a href="/events" className="mt-2 inline-block text-brand-600 hover:underline">
              Browse all events →
            </a>
          </div>
        )}
      </section>
    </>
  );
}
