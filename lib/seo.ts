import type { Event } from "@/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

// Build a JSON-LD Event schema object for Google's event rich results.
// See: https://developers.google.com/search/docs/appearance/structured-data/event
export function buildEventJsonLd(event: Event): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.start_date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${siteUrl}/events/${event.slug}`,
  };

  if (event.end_date) {
    jsonLd.endDate = event.end_date;
  }

  if (event.description) {
    jsonLd.description = event.description;
  }

  if (event.banner_url) {
    jsonLd.image = event.banner_url;
  }

  if (event.organizer_name) {
    jsonLd.organizer = {
      "@type": "Organization",
      name: event.organizer_name,
    };
  }

  if (event.venue) {
    jsonLd.location = {
      "@type": "Place",
      name: event.venue.name,
      ...(event.venue.address || event.venue.city
        ? {
            address: {
              "@type": "PostalAddress",
              ...(event.venue.address ? { streetAddress: event.venue.address } : {}),
              ...(event.venue.city ? { addressLocality: event.venue.city } : {}),
              addressRegion: "NJ",
              addressCountry: "US",
            },
          }
        : {}),
    };
  }

  if (event.is_free) {
    jsonLd.isAccessibleForFree = true;
    jsonLd.offers = {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      ...(event.external_url ? { url: event.external_url } : {}),
    };
  } else if (event.external_url) {
    jsonLd.offers = {
      "@type": "Offer",
      ...(event.price_range ? { description: event.price_range } : {}),
      availability: "https://schema.org/InStock",
      url: event.external_url,
    };
  }

  return jsonLd;
}
