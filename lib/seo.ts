import type { Metadata } from "next";
import type { Event } from "@/types";
import { formatEventDate } from "@/lib/dates";

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

// ─── Event meta description fallback ──────────────────────────────────────────
// Ahrefs Site Audit ("Meta description tag missing or empty", issue
// 57751310-001c-11e8-b746-001e67ed4656) flagged 244 /events/<slug> pages with no
// description tag at all — 31 indexable + 213 noindex past events.
//
// Root cause was NOT a content backlog. Event detail metadata read
//   description: event.short_description ?? event.description?.slice(0, 155)
// and BOTH columns are NULL for a whole class of imports: the upstream feeds only
// sometimes carry a blurb (e.g. lib/importers/ticketmaster.ts takes `tm.info`,
// which Ticketmaster omits for most Broadway/touring listings). When both are
// NULL the expression is `undefined` and Next.js emits no tag. Because the
// importers run on cron, hand-writing descriptions would be re-broken the next
// day — the fix has to be a deterministic fallback, not per-page copy.
//
// This composes a description from structured columns that are always present
// (title, start_date) plus whatever else we have (venue, city, price). It never
// invents facts: every clause is a real field, and a field we don't have is
// simply omitted. Ordering keeps the distinguishing bits (title, venue, date)
// first so the ~155-char clamp trims only the boilerplate tail.
//
// Precedence is unchanged: a human-written short_description still wins. This is
// only the last resort, replacing `undefined`.

const DESCRIPTION_MAX = 155;
const DESCRIPTION_BOILERPLATE =
  "Find event details, times, and directions on Bergen Beat.";

export interface EventDescriptionInput {
  title: string;
  start_date: string;
  is_free?: boolean;
  price_range?: string | null;
  venue?: { name: string; city?: string | null } | null;
}

export function buildEventDescription(event: EventDescriptionInput): string {
  const title = event.title.trim();
  const venueName = event.venue?.name?.trim() || null;
  const city = event.venue?.city?.trim() || null;

  // "Wicked at Gershwin Theatre in New York". Each clause is skipped when the
  // text already contains it, so feed titles that embed their own venue or town
  // don't stutter — e.g. "Summer Friday Guided Tours at the Hermitage in
  // Ho-Ho-Kus" keeps its own phrasing instead of gaining a second "at the
  // Hermitage in Ho-Ho-Kus", and "Teaneck Farmers Market" (venue row also named
  // "Teaneck") stays as-is.
  let lead = title;
  if (venueName && !title.toLowerCase().includes(venueName.toLowerCase())) {
    lead += ` at ${venueName}`;
  }
  if (city && !lead.toLowerCase().includes(city.toLowerCase())) {
    lead += ` in ${city}`;
  }

  // formatEventDate renders in America/New_York, so the date matches what the
  // page body shows. An unparseable start_date would yield "Invalid Date"; skip
  // the clause entirely rather than emit that.
  const formattedDate = Number.isNaN(new Date(event.start_date).getTime())
    ? null
    : formatEventDate(event.start_date);
  const dateClause = formattedDate ? ` on ${formattedDate}` : "";

  const priceClause = event.is_free
    ? "Free admission."
    : event.price_range
      ? `Tickets ${event.price_range}.`
      : null;

  const assemble = (withPrice: boolean, withBoilerplate: boolean): string =>
    [
      `${lead}${dateClause}.`,
      ...(withPrice && priceClause ? [priceClause] : []),
      ...(withBoilerplate ? [DESCRIPTION_BOILERPLATE] : []),
    ].join(" ");

  // Shed the least valuable clauses first (boilerplate, then price) so a long
  // title never costs us the date. Naively clamping the whole string used to cut
  // mid-date ("… on Friday…"), losing the one detail that makes each of these
  // descriptions unique.
  for (const candidate of [assemble(true, true), assemble(true, false), assemble(false, false)]) {
    if (candidate.length <= DESCRIPTION_MAX) return candidate;
  }

  // Title alone still overflows — trim it at a word boundary, keeping the date.
  const budget = DESCRIPTION_MAX - dateClause.length - 2; // "…" + "."
  const clipped = lead.slice(0, Math.max(0, budget));
  const lastSpace = clipped.lastIndexOf(" ");
  const trimmed = (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(/[,.]$/, "");
  return `${trimmed}…${dateClause}.`;
}

// Resolve the description for an event, honouring existing content first.
// Shared by the page metadata, the Event JSON-LD and the importers so all three
// surfaces agree on one value.
export function resolveEventDescription(
  event: EventDescriptionInput & {
    short_description?: string | null;
    description?: string | null;
  }
): string {
  const short = event.short_description?.trim();
  if (short) return short;

  const long = event.description?.trim();
  if (long) return long.slice(0, DESCRIPTION_MAX);

  return buildEventDescription(event);
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

  // Was `if (event.description)` — left the field off entirely on events with no
  // blurb (Google's Event rich-result guidance asks for a description, and the
  // same NULL columns that broke the meta tag broke this too). resolveEventDescription
  // prefers real content and falls back to the composed sentence.
  jsonLd.description = resolveEventDescription(event);

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
