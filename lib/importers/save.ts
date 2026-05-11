/**
 * Shared import-save logic for Bergen Beat
 *
 * Takes a list of ImportedEvent objects from any external API importer and:
 *  1. Checks import_log for already-imported external IDs (deduplication)
 *  2. Looks up or creates venue rows
 *  3. Auto-matches a category based on category_guess
 *  4. Inserts events as status='draft' (ready for admin review)
 *  5. Writes to import_log so the same external event is never re-imported
 *
 * Returns a summary: { imported, skipped, errors }
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { ImportedEvent } from "@/types";

export interface SaveResult {
  imported: number;
  skipped: number;
  errors: number;
  importedTitles: string[];
  errorMessages: string[];
}

function buildSlug(title: string, startDate: string): string {
  const date = new Date(startDate).toISOString().slice(0, 10); // YYYY-MM-DD
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base}-${date}`;
}

async function resolveVenueId(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  venue: ImportedEvent["venue"]
): Promise<string | null> {
  if (!venue) return null;

  // Try to find an existing venue by exact name match
  const { data: existing } = await supabase
    .from("venues")
    .select("id")
    .ilike("name", venue.name)
    .limit(1)
    .single();

  if (existing) return existing.id as string;

  // Generate a unique slug for the new venue
  const slugBase = [venue.name, venue.city]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const { data: slugConflict } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", slugBase)
    .maybeSingle();

  const venueSlug = slugConflict
    ? `${slugBase}-${Math.random().toString(36).slice(2, 6)}`
    : slugBase;

  // Create a new venue row
  const { data: created } = await supabase
    .from("venues")
    .insert({
      name: venue.name,
      slug: venueSlug,
      address: venue.address,
      city: venue.city,
      state: "NJ",
      lat: venue.lat,
      lng: venue.lng,
    })
    .select("id")
    .single();

  return created ? (created.id as string) : null;
}

// Maps venue city names → Bergen Beat neighborhood slugs.
// Cities not listed here are outside Bergen County and get no neighborhood tag.
const CITY_TO_NEIGHBORHOOD: Record<string, string> = {
  // Direct matches
  "hackensack":     "hackensack",
  "ridgewood":      "ridgewood",
  "paramus":        "paramus",
  "fort lee":       "fort-lee",
  "teaneck":        "teaneck",
  "englewood":      "englewood",
  "bergenfield":    "bergenfield",
  "closter":        "closter",
  "mahwah":         "mahwah",
  "ramsey":         "ramsey",
  "westwood":       "westwood",
  "oradell":        "oradell",
  // Other Bergen County municipalities → "other"
  "alpine":         "other",
  "bogota":         "other",
  "carlstadt":      "other",
  "cresskill":      "other",
  "demarest":       "other",
  "dumont":         "other",
  "east rutherford":"other",
  "edgewater":      "other",
  "elmwood park":   "other",
  "emerson":        "other",
  "fair lawn":      "other",
  "fairview":       "other",
  "franklin lakes": "other",
  "garfield":       "other",
  "glen rock":      "other",
  "harrington park":"other",
  "hasbrouck heights":"other",
  "haworth":        "other",
  "hillsdale":      "other",
  "ho-ho-kus":      "other",
  "hohokus":        "other",
  "leonia":         "other",
  "little ferry":   "other",
  "lodi":           "other",
  "lyndhurst":      "other",
  "maywood":        "other",
  "midland park":   "other",
  "montvale":       "other",
  "moonachie":      "other",
  "new milford":    "other",
  "north arlington":"other",
  "northvale":      "other",
  "norwood":        "other",
  "oakland":        "other",
  "old tappan":     "other",
  "palisades park": "other",
  "park ridge":     "other",
  "river edge":     "other",
  "river vale":     "other",
  "rochelle park":  "other",
  "rockleigh":      "other",
  "rutherford":     "other",
  "saddle brook":   "other",
  "saddle river":   "other",
  "south hackensack":"other",
  "tenafly":        "other",
  "teterboro":      "other",
  "upper saddle river":"other",
  "waldwick":       "other",
  "wallington":     "other",
  "washington township":"other",
  "wood-ridge":     "other",
  "woodcliff lake": "other",
  "woodridge":      "other",
  "wyckoff":        "other",
};

// Neighbourhood ID cache — avoids repeated DB lookups for the same slug
const neighborhoodIdCache = new Map<string, string | null>();

async function resolveNeighborhoodId(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  city: string | null | undefined
): Promise<string | null> {
  if (!city) return null;

  const slug = CITY_TO_NEIGHBORHOOD[city.toLowerCase().trim()];
  if (!slug) return null; // city not in Bergen County

  if (neighborhoodIdCache.has(slug)) return neighborhoodIdCache.get(slug)!;

  const { data } = await supabase
    .from("neighborhoods")
    .select("id")
    .eq("slug", slug)
    .single();

  const id = data ? (data.id as string) : null;
  neighborhoodIdCache.set(slug, id);
  return id;
}

async function resolveCategoryId(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  categoryGuess: string | null
): Promise<string | null> {
  if (!categoryGuess) return null;

  const { data } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", categoryGuess)
    .limit(1)
    .single();

  return data ? (data.id as string) : null;
}

export async function saveImportedEvents(
  events: ImportedEvent[],
  autoPublish = false
): Promise<SaveResult> {
  const supabase = createAdminSupabaseClient();
  const result: SaveResult = {
    imported: 0,
    skipped: 0,
    errors: 0,
    importedTitles: [],
    errorMessages: [],
  };

  for (const event of events) {
    try {
      // 1. Deduplication check
      const { data: logEntry } = await supabase
        .from("import_log")
        .select("id")
        .eq("source", event.source)
        .eq("external_id", event.external_id)
        .single();

      if (logEntry) {
        result.skipped++;
        continue;
      }

      // 2. Resolve venue
      const venueId = await resolveVenueId(supabase, event.venue);

      // 3. Resolve neighborhood from venue city
      const neighborhoodId = await resolveNeighborhoodId(supabase, event.venue?.city);

      // 4. Resolve category
      const categoryId = await resolveCategoryId(supabase, event.category_guess);

      // 4. Build a unique slug
      let slug = buildSlug(event.title, event.start_date);
      // Ensure slug uniqueness
      const { count } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("slug", slug);
      if (count && count > 0) {
        slug = `${slug}-${event.external_id.slice(-6)}`;
      }

      // 5. Insert event
      const { data: inserted, error } = await supabase
        .from("events")
        .insert({
          title: event.title,
          slug,
          short_description: event.short_description,
          description: event.description,
          start_date: event.start_date,
          end_date: event.end_date,
          is_free: event.is_free,
          price_range: event.price_range,
          external_url: event.external_url,
          banner_url: event.banner_url,
          organizer_name: event.organizer_name,
          source: event.source,
          external_id: event.external_id,
          venue_id: venueId,
          neighborhood_id: neighborhoodId,
          category_id: categoryId,
          status: autoPublish ? "published" : "draft",
          published_at: autoPublish ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (error) {
        result.errors++;
        result.errorMessages.push(`"${event.title}": ${error.message}`);
        // Log as error so we don't retry endlessly on the same bad event
        await supabase.from("import_log").insert({
          source: event.source,
          external_id: event.external_id,
          event_id: null,
          status: "error",
          raw_data: { error: error.message },
        });
        continue;
      }

      // 6. Write import_log row
      await supabase.from("import_log").insert({
        source: event.source,
        external_id: event.external_id,
        event_id: inserted!.id,
        status: "imported",
      });

      result.imported++;
      result.importedTitles.push(event.title);
    } catch (err) {
      result.errors++;
      result.errorMessages.push(
        `"${event.title}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}
