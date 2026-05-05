/**
 * PredictHQ importer for Bergen Beat
 *
 * Uses the PredictHQ Events API to search for events near Bergen County, NJ.
 * Requires: PREDICTHQ_ACCESS_TOKEN in environment variables.
 *
 * Docs: https://docs.predicthq.com/api/events
 */

import type { ImportedEvent } from "@/types";

// Bergen County, NJ center point
const BERGEN_COUNTY_LAT = 40.9581;
const BERGEN_COUNTY_LNG = -74.0741;
const SEARCH_RADIUS_MI = 15; // 15 miles covers most of Bergen County

interface PredictHQEntity {
  type: string;
  name?: string;
  formatted_address?: string;
}

interface PredictHQGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

interface PredictHQEvent {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  labels?: string[];
  start: string;         // ISO 8601 UTC
  end?: string | null;
  timezone?: string | null;
  phq_attendance?: number | null;
  geo?: PredictHQGeoPoint | null;
  entities?: PredictHQEntity[] | null;
  // Predicted relevance score
  relevance?: number | null;
}

interface PredictHQResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: PredictHQEvent[];
}

// Map PredictHQ categories to Bergen Beat category name hints
const CATEGORY_MAP: Record<string, string> = {
  "community":          "Community",
  "concerts":           "Music",
  "conferences":        "Business",
  "expos":              "Business",
  "festivals":          "Festivals",
  "performing-arts":    "Performing Arts",
  "sports":             "Sports",
  "school-holidays":    "Kids & Family",
  "observances":        "Community",
  "politics":           "Community",
  "daylight-savings":   "Other",
  "airport-delays":     "Other",
  "severe-weather":     "Other",
  "health-warnings":    "Health & Wellness",
  "terror-threats":     "Other",
  "disasters":          "Other",
};

// Categories to exclude (non-event, low-quality data)
const EXCLUDED_CATEGORIES = new Set([
  "airport-delays",
  "severe-weather",
  "health-warnings",
  "terror-threats",
  "disasters",
  "daylight-savings",
]);

function normalizeEvent(phq: PredictHQEvent): ImportedEvent {
  // Extract venue from entities
  const venueEntity = phq.entities?.find((e) => e.type === "venue");
  let venue: ImportedEvent["venue"] = null;

  if (venueEntity || phq.geo) {
    const coords = phq.geo?.coordinates;
    venue = {
      name: venueEntity?.name ?? "Venue TBD",
      address: venueEntity?.formatted_address ?? null,
      city: null, // PredictHQ doesn't always give a distinct city field
      lat: coords ? coords[1] : null,
      lng: coords ? coords[0] : null,
    };
  }

  return {
    title: phq.title,
    short_description: phq.description ? phq.description.slice(0, 200) : null,
    description: phq.description ?? null,
    start_date: phq.start,
    end_date: phq.end ?? null,
    is_free: false, // PredictHQ doesn't reliably expose pricing
    price_range: null,
    external_url: null, // PredictHQ doesn't return ticket URLs
    banner_url: null,
    organizer_name: phq.entities?.find((e) => e.type === "organizer")?.name ?? null,
    source: "predicthq",
    external_id: phq.id,
    venue,
    category_guess: CATEGORY_MAP[phq.category] ?? null,
  };
}

export async function fetchPredictHQEvents(
  maxPages = 3
): Promise<ImportedEvent[]> {
  const token = process.env.PREDICTHQ_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "PREDICTHQ_ACCESS_TOKEN is not set in environment variables"
    );
  }

  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const results: ImportedEvent[] = [];

  // PredictHQ uses offset-based pagination
  const pageSize = 50;
  let offset = 0;
  let fetchedPages = 0;

  while (fetchedPages < maxPages) {
    const params = new URLSearchParams({
      "within": `${SEARCH_RADIUS_MI}mi@${BERGEN_COUNTY_LAT},${BERGEN_COUNTY_LNG}`,
      "active.gte": now,
      "sort": "start",
      "limit": String(pageSize),
      "offset": String(offset),
      // Exclude noisy non-event categories
      "category": Object.keys(CATEGORY_MAP)
        .filter((c) => !EXCLUDED_CATEGORIES.has(c))
        .join(","),
    });

    const url = `https://api.predicthq.com/v1/events/?${params}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PredictHQ API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as PredictHQResponse;
    const normalized = data.results
      .filter((e) => !EXCLUDED_CATEGORIES.has(e.category))
      .map(normalizeEvent);

    results.push(...normalized);
    fetchedPages++;
    offset += pageSize;

    if (!data.next || results.length >= data.count) break;
  }

  return results;
}
