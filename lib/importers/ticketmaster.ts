/**
 * Ticketmaster importer for Bergen Beat
 *
 * Uses the Ticketmaster Discovery API v2 to search for events near Bergen County, NJ.
 * Requires: TICKETMASTER_API_KEY in environment variables.
 *
 * Free tier: 5,000 API calls/day — plenty for a daily sync.
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

import type { ImportedEvent } from "@/types";

// Bergen County, NJ center point
const BERGEN_COUNTY_LAT = 40.9581;
const BERGEN_COUNTY_LNG = -74.0741;
const SEARCH_RADIUS_MI = 15;

interface TmImage {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
}

interface TmVenue {
  name?: string;
  address?: { line1?: string } | null;
  city?: { name?: string } | null;
  location?: { latitude?: string; longitude?: string } | null;
}

interface TmPriceRange {
  type?: string;
  min?: number;
  max?: number;
  currency?: string;
}

interface TmClassification {
  segment?: { name?: string } | null;
  genre?: { name?: string } | null;
}

interface TmEvent {
  id: string;
  name: string;
  info?: string | null;
  pleaseNote?: string | null;
  url?: string | null;
  images?: TmImage[] | null;
  dates?: {
    start?: { dateTime?: string; localDate?: string } | null;
    end?: { dateTime?: string } | null;
  } | null;
  priceRanges?: TmPriceRange[] | null;
  classifications?: TmClassification[] | null;
  _embedded?: {
    venues?: TmVenue[] | null;
  } | null;
}

interface TmResponse {
  _embedded?: { events?: TmEvent[] } | null;
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  } | null;
}

// Map Ticketmaster segment/genre names to Bergen Beat category hints
const SEGMENT_MAP: Record<string, string> = {
  "Music":          "Music",
  "Sports":         "Sports",
  "Arts & Theatre": "Performing Arts",
  "Film":           "Film & Media",
  "Miscellaneous":  "Community",
  "Undefined":      "Community",
};

function pickBestImage(images: TmImage[] | null | undefined): string | null {
  if (!images?.length) return null;
  // Prefer 16:9 wide images; fallback to largest available
  const wide = images.filter((i) => i.ratio === "16_9").sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return wide[0]?.url ?? images[0]?.url ?? null;
}

function normalizeEvent(tm: TmEvent): ImportedEvent {
  const startDate =
    tm.dates?.start?.dateTime ?? tm.dates?.start?.localDate ?? new Date().toISOString();
  const endDate = tm.dates?.end?.dateTime ?? null;

  // Pricing
  const priceRanges = tm.priceRanges?.filter((p) => p.type !== "platinum") ?? [];
  const isFree = priceRanges.length === 0 || priceRanges.every((p) => (p.min ?? 0) === 0);
  let priceRange: string | null = null;
  if (!isFree && priceRanges.length > 0) {
    const min = Math.min(...priceRanges.map((p) => p.min ?? 0));
    const max = Math.max(...priceRanges.map((p) => p.max ?? 0));
    priceRange = min === max ? `$${min}` : `$${min}–$${max}`;
  }

  // Venue
  const tmVenue = tm._embedded?.venues?.[0];
  const venue = tmVenue
    ? {
        name: tmVenue.name ?? "Venue TBD",
        address: tmVenue.address?.line1 ?? null,
        city: tmVenue.city?.name ?? null,
        lat: tmVenue.location?.latitude ? parseFloat(tmVenue.location.latitude) : null,
        lng: tmVenue.location?.longitude ? parseFloat(tmVenue.location.longitude) : null,
      }
    : null;

  // Category
  const segment = tm.classifications?.[0]?.segment?.name ?? null;
  const genre = tm.classifications?.[0]?.genre?.name ?? null;
  const categoryGuess = (segment ? SEGMENT_MAP[segment] : null) ?? genre ?? null;

  return {
    title: tm.name,
    short_description: tm.info ? tm.info.slice(0, 200) : null,
    description: [tm.info, tm.pleaseNote].filter(Boolean).join("\n\n") || null,
    start_date: startDate,
    end_date: endDate,
    is_free: isFree,
    price_range: priceRange,
    external_url: tm.url ?? null,
    banner_url: pickBestImage(tm.images),
    organizer_name: null,
    source: "ticketmaster",
    external_id: tm.id,
    venue,
    category_guess: categoryGuess,
  };
}

export async function fetchTicketmasterEvents(maxPages = 3): Promise<ImportedEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    throw new Error("TICKETMASTER_API_KEY is not set in environment variables");
  }

  const now = new Date().toISOString().slice(0, 19) + "Z";
  const results: ImportedEvent[] = [];

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      apikey: apiKey,
      latlong: `${BERGEN_COUNTY_LAT},${BERGEN_COUNTY_LNG}`,
      radius: String(SEARCH_RADIUS_MI),
      unit: "miles",
      startDateTime: now,
      sort: "date,asc",
      size: "50",
      page: String(page),
      countryCode: "US",
    });

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params}`;

    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ticketmaster API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as TmResponse;
    const events = data._embedded?.events ?? [];

    const normalized = events.map(normalizeEvent);

    results.push(...normalized);

    const totalPages = data.page?.totalPages ?? 1;
    if (page + 1 >= totalPages) break;
  }

  return results;
}
