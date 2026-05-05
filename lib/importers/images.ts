/**
 * Unsplash image lookup for Bergen Beat
 *
 * For imported events that have no banner image (e.g. PredictHQ),
 * this finds a relevant Unsplash photo based on the event's category/title.
 *
 * Free tier: 50 requests/hour (demo), 5000/hour (production app).
 * Requires: UNSPLASH_ACCESS_KEY in environment variables.
 *
 * Sign up: https://unsplash.com/developers
 */

import type { ImportedEvent } from "@/types";

// Pre-picked search terms per Bergen Beat category name
// These produce consistently good results on Unsplash
const CATEGORY_QUERIES: Record<string, string> = {
  "Music":           "live music concert",
  "Food & Drink":    "food festival market",
  "Performing Arts": "theater performance stage",
  "Sports":          "sports game crowd",
  "Arts":            "art gallery exhibition",
  "Community":       "community event outdoor",
  "Kids & Family":   "family fun children outdoor",
  "Health & Wellness": "yoga wellness fitness",
  "Film & Media":    "film cinema outdoor screening",
  "Festivals":       "outdoor festival crowd",
  "Business":        "conference networking",
  "Holiday":         "holiday celebration lights",
};

const FALLBACK_QUERY = "bergen county new jersey event";

interface UnsplashPhoto {
  urls: {
    regular: string;  // ~1080px wide — good for banners
    small: string;
  };
  alt_description: string | null;
  user: { name: string; links: { html: string } };
  links: { html: string };
}

interface UnsplashResponse {
  results: UnsplashPhoto[];
  total: number;
}

// Simple in-memory cache so we don't re-fetch the same query within one import run
const queryCache = new Map<string, string | null>();

async function fetchUnsplashImage(query: string): Promise<string | null> {
  if (queryCache.has(query)) return queryCache.get(query)!;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const params = new URLSearchParams({
      query,
      per_page: "5",
      orientation: "landscape",
      content_filter: "high",
    });

    const res = await fetch(
      `https://api.unsplash.com/search/photos?${params}`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as UnsplashResponse;
    // Pick a random result from the top 5 so images vary across events
    const photos = data.results;
    if (!photos.length) {
      queryCache.set(query, null);
      return null;
    }

    const photo = photos[Math.floor(Math.random() * photos.length)];
    const url = photo.urls.regular;
    queryCache.set(query, url);
    return url;
  } catch {
    return null;
  }
}

/**
 * For each event in the list that has no banner_url, look up an Unsplash image.
 * Events that already have a banner_url (e.g. from Ticketmaster) are untouched.
 * Returns a new array with banner_url filled in where possible.
 */
export async function enrichWithImages(
  events: ImportedEvent[]
): Promise<ImportedEvent[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    // Silently skip — Unsplash is optional
    return events;
  }

  return Promise.all(
    events.map(async (event) => {
      if (event.banner_url) return event; // already has an image

      // Build a search query: prefer category match, fall back to title keywords
      const categoryQuery = event.category_guess
        ? CATEGORY_QUERIES[event.category_guess]
        : null;

      // For title-based search, strip common filler words and keep the meat
      const titleQuery = event.title
        .replace(/\b(the|a|an|and|or|in|at|of|for|with|presents|presents|featuring)\b/gi, "")
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join(" ");

      const query = categoryQuery ?? titleQuery ?? FALLBACK_QUERY;
      const imageUrl = await fetchUnsplashImage(query);

      return { ...event, banner_url: imageUrl };
    })
  );
}
