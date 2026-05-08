import type { Event } from "@/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net";

// ─── Event JSON-LD ────────────────────────────────────────────────────────────
// Build a JSON-LD Event schema for Google's event rich results.
// https://developers.google.com/search/docs/appearance/structured-data/event

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

// ─── BreadcrumbList JSON-LD ───────────────────────────────────────────────────
// https://developers.google.com/search/docs/appearance/structured-data/breadcrumb

interface BreadcrumbItem {
  name: string;
  href: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      // Handle both absolute URLs and relative paths
      item: item.href.startsWith("http") ? item.href : `${siteUrl}${item.href}`,
    })),
  };
}

// ─── WebSite JSON-LD ──────────────────────────────────────────────────────────
// Enables Google Sitelinks Searchbox and declares the site entity.
// https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox

export function buildWebSiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Bergen Beat",
    url: siteUrl,
    description:
      "Discover the best local events in Bergen County, NJ — concerts, markets, festivals, food events, and more.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/events?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ─── Organization JSON-LD ─────────────────────────────────────────────────────
// Declares the site as an organization entity. Placed in the root layout so it
// appears on every page. Helps Google Knowledge Panel and entity disambiguation.
// https://developers.google.com/search/docs/appearance/structured-data/organization

export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Bergen Beat",
    url: siteUrl,
    logo: `${siteUrl}/bergen-beat-logo.png`,
    description:
      "Bergen Beat is a local events discovery platform for Bergen County, NJ — concerts, markets, festivals, food events, and more.",
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Bergen County",
      containedInPlace: { "@type": "State", name: "New Jersey" },
    },
    sameAs: [],
  };
}

// ─── Place JSON-LD ─────────────────────────────────────────────────────────────
// Used on venue and neighborhood pages to declare a physical place.
// https://developers.google.com/search/docs/appearance/structured-data/local-business

export interface PlaceData {
  name: string;
  url: string;
  description?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
  };
  geo?: { lat: number; lng: number };
  website?: string;
}

export function buildPlaceJsonLd(place: PlaceData): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: place.name,
    url: place.url,
  };

  if (place.description) jsonLd.description = place.description;
  if (place.website)     jsonLd.sameAs = place.website;

  if (place.address && Object.values(place.address).some(Boolean)) {
    jsonLd.address = {
      "@type": "PostalAddress",
      ...(place.address.streetAddress  ? { streetAddress:   place.address.streetAddress }  : {}),
      ...(place.address.addressLocality ? { addressLocality: place.address.addressLocality } : {}),
      addressRegion:  place.address.addressRegion  ?? "NJ",
      addressCountry: "US",
      ...(place.address.postalCode ? { postalCode: place.address.postalCode } : {}),
    };
  }

  if (place.geo) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude:  place.geo.lat,
      longitude: place.geo.lng,
    };
  }

  return jsonLd;
}

// ─── ItemList JSON-LD ─────────────────────────────────────────────────────────
// Used on listing pages (categories, neighborhoods, venues) so Google can show
// individual items as rich results inside a list.
// https://developers.google.com/search/docs/appearance/structured-data/item-list

export interface ItemListEntry {
  name: string;
  url: string;
  position?: number;
  image?: string;
  description?: string;
}

export function buildItemListJsonLd(
  name: string,
  url: string,
  items: ItemListEntry[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: item.position ?? i + 1,
      name: item.name,
      url: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
      ...(item.description ? { description: item.description } : {}),
      ...(item.image       ? { image: item.image }              : {}),
    })),
  };
}
