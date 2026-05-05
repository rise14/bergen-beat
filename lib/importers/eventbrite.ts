/**
 * Eventbrite importer for Bergen Beat
 *
 * Uses the Eventbrite API v3 to search for events near Bergen County, NJ.
 * Requires: EVENTBRITE_API_KEY in environment variables.
 *
 * Docs: https://www.eventbrite.com/platform/api
 */

import type { ImportedEvent } from "@/types";

// Bergen County, NJ center point
const BERGEN_COUNTY_LAT = 40.9581;
const BERGEN_COUNTY_LNG = -74.0741;
const SEARCH_RADIUS_KM = 25; // ~15 miles — covers most of Bergen County

interface EventbriteVenue {
  name: string | null;
  address?: {
    address_1?: string | null;
    city?: string | null;
    latitude?: string | null;
    longitude?: string | null;
  } | null;
}

interface EventbriteOrganizer {
  name?: string | null;
}

interface EventbriteTicketClass {
  free?: boolean;
  cost?: {
    display?: string | null;
  } | null;
}

interface EventbriteEvent {
  id: string;
  name: { text: string | null };
  description?: { text: string | null } | null;
  summary?: string | null;
  start: { utc: string };
  end?: { utc: string } | null;
  url: string;
  logo?: { url: string | null } | null;
  is_free?: boolean;
  ticket_classes?: EventbriteTicketClass[] | null;
  venue?: EventbriteVenue | null;
  organizer?: EventbriteOrganizer | null;
  category_id?: string | null;
}

interface EventbriteResponse {
  events: EventbriteEvent[];
  pagination: {
    page_number: number;
    page_count: number;
    has_more_items: boolean;
  };
}

// Map Eventbrite category IDs to Bergen Beat category name hints
const CATEGORY_MAP: Record<string, string> = {
  "103": "Music",
  "110": "Food & Drink",
  "113": "Community",
  "105": "Performing Arts",
  "108": "Film",
  "107": "Health & Wellness",
  "102": "Science & Tech",
  "101": "Business",
  "109": "Travel",
  "115": "Sports",
  "116": "Kids & Family",
  "117": "Holiday",
  "119": "Arts",
  "111": "Government",
  "112": "Charity",
  "114": "Fashion",
  "118": "Home",
  "199": "Other",
};

function normalizeEvent(eb: EventbriteEvent): ImportedEvent {
  // Determine price
  const isFree =
    eb.is_free === true ||
    (eb.ticket_classes?.every((tc) => tc.free) ?? false);

  let priceRange: string | null = null;
  if (!isFree && eb.ticket_classes?.length) {
    const prices = eb.ticket_classes
      .filter((tc) => !tc.free && tc.cost?.display)
      .map((tc) => tc.cost!.display!);
    if (prices.length > 0) {
      priceRange = prices.length === 1 ? prices[0] : `${prices[0]}+`;
    }
  }

  // Venue
  const venue = eb.venue
    ? {
        name: eb.venue.name ?? "Unknown Venue",
        address: eb.venue.address?.address_1 ?? null,
        city: eb.venue.address?.city ?? null,
        lat: eb.venue.address?.latitude
          ? parseFloat(eb.venue.address.latitude)
          : null,
        lng: eb.venue.address?.longitude
          ? parseFloat(eb.venue.address.longitude)
          : null,
      }
    : null;

  return {
    title: eb.name.text ?? "Untitled Event",
    short_description: eb.summary ?? null,
    description: eb.description?.text ?? null,
    start_date: eb.start.utc,
    end_date: eb.end?.utc ?? null,
    is_free: isFree,
    price_range: priceRange,
    external_url: eb.url,
    banner_url: eb.logo?.url ?? null,
    organizer_name: eb.organizer?.name ?? null,
    source: "eventbrite",
    external_id: eb.id,
    venue,
    category_guess: eb.category_id ? (CATEGORY_MAP[eb.category_id] ?? null) : null,
  };
}

export async function fetchEventbriteEvents(
  maxPages = 3
): Promise<ImportedEvent[]> {
  const apiKey = process.env.EVENTBRITE_API_KEY;
  if (!apiKey) {
    throw new Error("EVENTBRITE_API_KEY is not set in environment variables");
  }

  const now = new Date().toISOString();
  const results: ImportedEvent[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams({
      "location.latitude": String(BERGEN_COUNTY_LAT),
      "location.longitude": String(BERGEN_COUNTY_LNG),
      "location.within": `${SEARCH_RADIUS_KM}km`,
      "start_date.range_start": now,
      "sort_by": "date",
      "expand": "venue,organizer,ticket_classes",
      "page": String(page),
    });

    const url = `https://www.eventbriteapi.com/v3/events/search/?${params}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 }, // never cache — always fresh
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Eventbrite API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as EventbriteResponse;
    const normalized = data.events.map(normalizeEvent);
    results.push(...normalized);

    if (!data.pagination.has_more_items || page >= data.pagination.page_count) {
      break;
    }
  }

  return results;
}
