/**
 * iCal importer for Bergen Beat
 *
 * Fetches public .ics calendar feeds (libraries, government, venues, etc.)
 * and converts VEVENT entries into ImportedEvent objects.
 *
 * Feed URLs are stored in the `ical_sources` table and managed from
 * /admin/import. No API key required — just a public .ics URL.
 *
 * Limitations:
 *   - Recurring events (RRULE) are skipped — too complex for our use case
 *   - LOCATION is treated as a free-text venue name (no geocoding)
 *   - Timezone offsets for non-UTC dates assume America/New_York (ET)
 */

import type { ImportedEvent } from "@/types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { fetchRssSource } from "./rss";

export interface IcalSource {
  id: string;
  name: string;
  url: string;
  /** 'ical' (default) or 'rss' — stored as source_type column in ical_sources table */
  source_type: "ical" | "rss";
  category_guess: string | null;
  enabled: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

// ─── iCal parser ─────────────────────────────────────────────────────────────

/**
 * Unfold iCal content lines (RFC 5545 §3.1):
 * A long content line may be split across multiple lines, where each
 * continuation line begins with a space or tab character.
 */
function unfold(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

/**
 * Parse a DTSTART or DTEND value (with optional TZID param) into an ISO string.
 * Handles:
 *   - 20240101T150000Z         (UTC)
 *   - 20240101T150000          (assume ET: UTC-5 standard / UTC-4 daylight)
 *   - TZID=America/New_York:20240101T150000  (explicit TZ, still assume ET)
 *   - 20240101                 (all-day → midnight ET)
 */
function parseIcalDate(value: string, params: string): string | null {
  // Strip TZID param prefix if present in value (e.g. "TZID=X:20240101T150000")
  const colonIdx = value.indexOf(":");
  const raw = colonIdx !== -1 ? value.slice(colonIdx + 1) : value;

  const isUtc    = raw.endsWith("Z");
  const isAllDay = /^\d{8}$/.test(raw.trim());
  const dateStr  = raw.trim().replace("Z", "");

  if (isAllDay) {
    // e.g. 20240101 → 2024-01-01T00:00:00-05:00 (ET midnight)
    const y = dateStr.slice(0, 4);
    const m = dateStr.slice(4, 6);
    const d = dateStr.slice(6, 8);
    return `${y}-${m}-${d}T00:00:00-05:00`;
  }

  // e.g. 20240101T150000
  if (!/^\d{8}T\d{6}/.test(dateStr)) return null;

  const y   = dateStr.slice(0, 4);
  const mo  = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  const h   = dateStr.slice(9, 11);
  const min = dateStr.slice(11, 13);
  const s   = dateStr.slice(13, 15);

  if (isUtc) return `${y}-${mo}-${day}T${h}:${min}:${s}Z`;

  // Naive ET assumption — good enough for Bergen County events
  // We use -05:00 (EST); DST is ignored but off by 1h only
  return `${y}-${mo}-${day}T${h}:${min}:${s}-05:00`;
}

/**
 * Unescape iCal text values (RFC 5545):
 * \n → newline, \, → comma, \; → semicolon, \\ → backslash
 */
function unescapeText(val: string): string {
  return val
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

interface RawVEvent {
  uid:         string | null;
  summary:     string | null;
  description: string | null;
  dtstart:     string | null;
  dtend:       string | null;
  url:         string | null;
  location:    string | null;
  organizer:   string | null;
  image:       string | null;
  isRecurring: boolean;
}

function parseVEvents(icsText: string): RawVEvent[] {
  const unfolded = unfold(icsText);
  const events: RawVEvent[] = [];
  const blocks = unfolded.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const lines = block.split("\n").filter(Boolean);

    const ev: RawVEvent = {
      uid: null, summary: null, description: null,
      dtstart: null, dtend: null, url: null,
      location: null, organizer: null, image: null,
      isRecurring: false,
    };

    for (const line of lines) {
      const sepIdx = line.indexOf(":");
      if (sepIdx === -1) continue;

      const keyPart = line.slice(0, sepIdx).toUpperCase();
      const val     = line.slice(sepIdx + 1).trim();

      // Extract base key (before any ; params)
      const baseKey = keyPart.split(";")[0];
      const params  = keyPart.includes(";") ? keyPart.slice(keyPart.indexOf(";") + 1) : "";

      switch (baseKey) {
        case "UID":
          ev.uid = val;
          break;
        case "SUMMARY":
          ev.summary = unescapeText(val);
          break;
        case "DESCRIPTION":
          ev.description = unescapeText(val);
          break;
        case "DTSTART":
          ev.dtstart = parseIcalDate(val, params);
          break;
        case "DTEND":
          ev.dtend = parseIcalDate(val, params);
          break;
        case "URL":
          ev.url = val || null;
          break;
        case "LOCATION":
          ev.location = unescapeText(val) || null;
          break;
        case "ORGANIZER":
          // ORGANIZER can be "CN=Name:mailto:email" — extract CN
          {
            const cnMatch = keyPart.match(/CN=([^;:]+)/i);
            ev.organizer = cnMatch ? cnMatch[1] : (val.replace(/^mailto:/i, "") || null);
          }
          break;
        case "RRULE":
          ev.isRecurring = true;
          break;
        case "IMAGE":
        case "ATTACH":
          // Some feeds include image URLs in ATTACH or IMAGE
          if (val.match(/^https?:\/\/.+\.(jpg|jpeg|png|webp)/i)) {
            ev.image = val;
          }
          break;
      }
    }

    events.push(ev);
  }

  return events;
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Try to extract a city name from a free-text LOCATION string.
 * e.g. "123 Main St, Hackensack, NJ 07601" → "Hackensack"
 * Returns null if no Bergen County city is detected.
 */
const BERGEN_CITIES = new Set([
  "hackensack", "ridgewood", "paramus", "fort lee", "teaneck", "englewood",
  "bergenfield", "closter", "mahwah", "ramsey", "westwood", "oradell",
  "alpine", "bogota", "carlstadt", "cresskill", "demarest", "dumont",
  "east rutherford", "edgewater", "elmwood park", "emerson", "fair lawn",
  "fairview", "franklin lakes", "garfield", "glen rock", "harrington park",
  "hasbrouck heights", "haworth", "hillsdale", "ho-ho-kus", "leonia",
  "little ferry", "lodi", "lyndhurst", "maywood", "midland park", "montvale",
  "moonachie", "new milford", "north arlington", "northvale", "norwood",
  "oakland", "old tappan", "palisades park", "park ridge", "river edge",
  "river vale", "rochelle park", "rutherford", "saddle brook", "saddle river",
  "south hackensack", "tenafly", "teterboro", "upper saddle river", "waldwick",
  "wallington", "washington township", "wood-ridge", "woodcliff lake", "wyckoff",
]);

function extractCity(location: string | null): string | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const city of BERGEN_CITIES) {
    if (lower.includes(city)) {
      // Title-case the city
      return city.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return null;
}

function normalizeEvent(
  raw: RawVEvent,
  source: IcalSource,
): ImportedEvent | null {
  if (!raw.uid || !raw.summary || !raw.dtstart) return null;
  if (raw.isRecurring) return null; // skip recurring — too complex

  const city     = extractCity(raw.location);
  const venue    = raw.location
    ? { name: raw.location.split(",")[0].trim(), address: raw.location, city, lat: null, lng: null }
    : null;

  const shortDesc = raw.description
    ? raw.description.replace(/\n+/g, " ").slice(0, 200)
    : null;

  return {
    title:             raw.summary,
    short_description: shortDesc,
    description:       raw.description,
    start_date:        raw.dtstart,
    end_date:          raw.dtend,
    is_free:           true,         // most library/community events are free
    price_range:       null,
    external_url:      raw.url,
    banner_url:        raw.image,
    organizer_name:    raw.organizer ?? source.name,
    source:            "ical",
    external_id:       `${source.id}:${raw.uid}`,
    venue,
    category_guess:    source.category_guess,
  };
}

// ─── Fetch one source ─────────────────────────────────────────────────────────

export async function fetchIcalSource(source: IcalSource): Promise<ImportedEvent[]> {
  const res = await fetch(source.url, {
    headers: { "User-Agent": "BergenBeat/1.0 (events calendar aggregator)" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${source.url}`);
  }

  const text    = await res.text();
  const rawEvs  = parseVEvents(text);
  const now     = new Date().toISOString();

  return rawEvs
    .map((r) => normalizeEvent(r, source))
    .filter((e): e is ImportedEvent => e !== null)
    .filter((e) => e.start_date! >= now);   // only future events
}

// ─── Fetch all enabled sources ────────────────────────────────────────────────

export interface IcalImportResult {
  source: IcalSource;
  fetched: number;
  error: string | null;
  events: ImportedEvent[];
}

export async function fetchAllIcalSources(): Promise<IcalImportResult[]> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("ical_sources")
    .select("*")
    .eq("enabled", true)
    .order("name", { ascending: true });

  const sources = (data ?? []) as IcalSource[];
  const results: IcalImportResult[] = [];

  for (const source of sources) {
    try {
      const events =
        source.source_type === "rss"
          ? await fetchRssSource(source)
          : await fetchIcalSource(source);
      // Update last_fetched_at
      await supabase
        .from("ical_sources")
        .update({ last_fetched_at: new Date().toISOString() })
        .eq("id", source.id);
      results.push({ source, fetched: events.length, error: null, events });
    } catch (err) {
      results.push({
        source, fetched: 0,
        error: err instanceof Error ? err.message : String(err),
        events: [],
      });
    }
  }

  return results;
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

export async function getIcalSources(): Promise<IcalSource[]> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("ical_sources")
    .select("*")
    .order("name", { ascending: true });
  return (data ?? []) as IcalSource[];
}
