import type { Metadata } from "next";
import type { Event } from "@/types";

// ─── Canonical site URL ───────────────────────────────────────────────────────
// The canonical host is `www.bergenbeat.net`. next.config.js redirects the bare
// apex (bergenbeat.net) to www, so any absolute URL we emit on the apex host is
// a URL that immediately redirects — which breaks sitemaps (Ahrefs: "3XX
// redirect in sitemap"), canonical tags and OG URLs.
//
// NEXT_PUBLIC_SITE_URL is set per environment and is easy to get wrong (a bare
// apex value shipped to production is exactly how the sitemap ended up listing
// 52 redirecting URLs). normalizeSiteUrl() makes that misconfiguration
// harmless: it upgrades the apex host to www and trims a trailing slash so
// concatenated paths never produce a double slash.
//
// Localhost and any other host are left alone, so dev and preview still work.
export function normalizeSiteUrl(rawUrl: string): string {
  let normalized = rawUrl.trim().replace(/\/+$/, "");

  try {
    const parsed = new URL(normalized);
    if (parsed.hostname === "bergenbeat.net") {
      parsed.hostname = "www.bergenbeat.net";
      parsed.protocol = "https:";
      normalized = parsed.toString().replace(/\/+$/, "");
    }
  } catch {
    // Not a parseable absolute URL — return the trimmed value untouched rather
    // than throwing during a build.
  }

  return normalized;
}

export const canonicalSiteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net"
);

const siteUrl = canonicalSiteUrl;

// ─── Open Graph ───────────────────────────────────────────────────────────────
// Ahrefs Site Audit ("Open Graph tags incomplete") requires FOUR tags on every
// page: og:title, og:type, og:image and og:url.
//
// The trap: Next.js does NOT deep-merge the `openGraph` object from the root
// layout into a page's own metadata — a page that declares `openGraph: { url }`
// REPLACES the parent object wholesale and silently drops og:type, og:site_name
// and og:locale. That's how 258 pages ended up without og:type despite the root
// layout declaring `type: "website"`.
//
// So never write a bare `openGraph: {...}` literal in a page. Call this helper:
// it re-states the shared defaults every time, so the emitted tag set is always
// complete regardless of what the parent declared.
//
// og:image is deliberately NOT set here. Next.js file-based OG images
// (`opengraph-image.tsx`) are injected automatically per route segment, and an
// explicit `images` value — including an empty array — overrides them. Pass
// `images` only for a genuinely page-specific image (e.g. an event banner), and
// pass `undefined` (never `[]`) to fall back to the segment's generated image.

export interface OpenGraphInput {
  /** Page path ("/venues/foo") or absolute URL. Becomes og:url — always absolute. */
  url: string;
  title?: string;
  description?: string;
  /** Omit entirely to inherit the route segment's opengraph-image.tsx. */
  images?: NonNullable<Metadata["openGraph"]>["images"];
  /** Defaults to "website"; event detail pages pass "article". */
  type?: "website" | "article";
}

export function buildOpenGraph(input: OpenGraphInput): Metadata["openGraph"] {
  const absoluteUrl = input.url.startsWith("http")
    ? input.url
    : `${siteUrl}${input.url.startsWith("/") ? "" : "/"}${input.url}`;

  return {
    type: input.type ?? "website",
    siteName: "Bergen Beat",
    locale: "en_US",
    url: absoluteUrl,
    ...(input.title       ? { title: input.title }             : {}),
    ...(input.description ? { description: input.description } : {}),
    // Only include `images` when a real image was supplied — an empty array
    // would suppress the file-based OG image for the segment.
    ...(input.images && (!Array.isArray(input.images) || input.images.length > 0)
      ? { images: input.images }
      : {}),
  };
}

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
