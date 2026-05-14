/**
 * RSS / Atom importer for Bergen Beat
 *
 * Fetches public RSS 2.0 and Atom feeds (Patch.com, event aggregators, etc.)
 * and converts items into ImportedEvent objects.
 *
 * Feed URLs are stored in the `ical_sources` table (shared with iCal feeds)
 * distinguished by source_type = 'rss'. Managed from /admin/import.
 *
 * Event detection strategy:
 *   1. Items with explicit event date fields (ev:startdate, event:startdate) → always included
 *   2. Items categorised as "Events" or "Calendar"                           → always included
 *   3. Items whose title/description contains 2+ event keywords              → included
 *   4. Everything else                                                        → skipped
 *
 * Patch.com notes:
 *   Use the town-specific events RSS:
 *     https://patch.com/new-jersey/<town>/local-events/rss
 *   This returns only Event items, so all of them are event-like.
 */

import type { ImportedEvent } from "@/types";
import type { IcalSource } from "./ical";

// ─── Low-level XML helpers (no external packages) ─────────────────────────────

/**
 * Extract the text content of the first matching XML/HTML tag.
 * Handles CDATA sections, namespaced tags, and simple plain values.
 */
function xmlText(tag: string, xml: string): string | null {
  // Allow namespace prefix like "content:encoded", "dc:date"
  const escapedTag = tag.replace(":", "\\:");
  const re = new RegExp(
    `<${escapedTag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${escapedTag}>`,
    "i"
  );
  const m = xml.match(re);
  if (!m) return null;
  return (m[1] ?? m[2] ?? "").trim() || null;
}

/**
 * Extract an attribute value from the first matching tag.
 * e.g. xmlAttr("enclosure", "url", block) → "https://..."
 */
function xmlAttr(tag: string, attr: string, xml: string): string | null {
  const escapedTag = tag.replace(":", "\\:");
  const re = new RegExp(
    `<${escapedTag}(?:\\s[^>]*?)?\\s${attr}=["']([^"']+)["'][^>]*?>`,
    "i"
  );
  const m = xml.match(re);
  return m ? m[1] : null;
}

/** True when the feed is Atom format (has a <feed> root element). */
function isAtom(xml: string): boolean {
  return /<feed\b/i.test(xml);
}

/** Split XML string into blocks delimited by <tagName>…</tagName>. */
function extractBlocks(xml: string, tagName: string): string[] {
  const blocks: string[] = [];
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  let pos = 0;
  while (true) {
    const start = xml.indexOf(openTag, pos);
    if (start === -1) break;
    const end = xml.indexOf(closeTag, start);
    if (end === -1) break;
    blocks.push(xml.slice(start, end + closeTag.length));
    pos = end + closeTag.length;
  }
  return blocks;
}

// ─── Raw item types ────────────────────────────────────────────────────────────

interface RawRssItem {
  title:        string | null;
  description:  string | null;
  link:         string | null;
  pubDate:      string | null;
  enclosureUrl: string | null;
  categories:   string[];
  guid:         string | null;
  /** Explicit event start date (ev:startdate, event:startdate) */
  eventStart:   string | null;
  /** Explicit event end date */
  eventEnd:     string | null;
  /** Location string */
  location:     string | null;
}

// ─── RSS 2.0 parsing ───────────────────────────────────────────────────────────

function parseOneRssItem(block: string): RawRssItem {
  // Collect all <category> values
  const categories: string[] = [];
  const catRe = /<category[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/category>/gi;
  let cm: RegExpExecArray | null;
  while ((cm = catRe.exec(block)) !== null) {
    const cat = (cm[1] ?? cm[2] ?? "").trim();
    if (cat) categories.push(cat);
  }

  // Image from enclosure, media:content, or media:thumbnail
  const enclosureUrl =
    xmlAttr("enclosure", "url", block) ??
    xmlAttr("media:content", "url", block) ??
    xmlAttr("media:thumbnail", "url", block) ??
    null;

  // <link> in RSS can be a bare text node (not href attribute)
  const linkText = xmlText("link", block) ?? xmlAttr("link", "href", block);

  return {
    title:       xmlText("title", block),
    description: xmlText("description", block) ?? xmlText("content:encoded", block),
    link:        linkText,
    pubDate:     xmlText("pubDate", block) ?? xmlText("dc:date", block),
    enclosureUrl,
    categories,
    guid:        xmlText("guid", block),
    eventStart:  xmlText("ev:startdate", block) ?? xmlText("event:startdate", block),
    eventEnd:    xmlText("ev:enddate", block)   ?? xmlText("event:enddate", block),
    location:    xmlText("ev:location", block)  ?? xmlText("event:location", block),
  };
}

function parseRssItems(xml: string): RawRssItem[] {
  return extractBlocks(xml, "item").map(parseOneRssItem);
}

// ─── Atom parsing ──────────────────────────────────────────────────────────────

function parseOneAtomEntry(block: string): RawRssItem {
  // <link href="..."> or bare <link>...</link>
  const linkHref = xmlAttr("link", "href", block) ?? xmlText("link", block);

  const categories: string[] = [];
  const catRe = /<category[^>]*\bterm=["']([^"']+)["'][^>]*>/gi;
  let cm: RegExpExecArray | null;
  while ((cm = catRe.exec(block)) !== null) {
    categories.push(cm[1]);
  }

  return {
    title:       xmlText("title", block),
    description: xmlText("summary", block) ?? xmlText("content", block),
    link:        linkHref,
    pubDate:     xmlText("published", block) ?? xmlText("updated", block),
    enclosureUrl:
      xmlAttr("media:thumbnail", "url", block) ??
      xmlAttr("media:content", "url", block) ??
      null,
    categories,
    guid:       xmlText("id", block),
    eventStart: xmlText("gCal:when", block),
    eventEnd:   null,
    location:   xmlText("gd:where", block),
  };
}

function parseAtomEntries(xml: string): RawRssItem[] {
  return extractBlocks(xml, "entry").map(parseOneAtomEntry);
}

// ─── Event detection ───────────────────────────────────────────────────────────

const EVENT_KEYWORDS = [
  "event", "festival", "concert", "show", "fair", "market", "parade",
  "ceremony", "celebration", "workshop", "class", "seminar", "lecture",
  "performance", "exhibit", "exhibition", "opening", "gala", "fundraiser",
  "race", "walk", "run", "tournament", "game", "meet", "gathering",
  "expo", "conference", "meetup", "screening", "tasting", "trivia",
];

function isEventLike(item: RawRssItem): boolean {
  if (item.eventStart) return true; // has explicit event date

  const catLower = item.categories.map((c) => c.toLowerCase()).join(" ");
  if (catLower.includes("event") || catLower.includes("calendar")) return true;

  const titleLower = (item.title ?? "").toLowerCase();
  if (EVENT_KEYWORDS.some((kw) => titleLower.includes(kw))) return true;

  // Description: require 2+ event keywords to reduce false positives
  const descLower = (item.description ?? "").toLowerCase().slice(0, 600);
  const hits = EVENT_KEYWORDS.filter((kw) => descLower.includes(kw)).length;
  return hits >= 2;
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function parseFeedDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

// ─── City / venue extraction ──────────────────────────────────────────────────

const BERGEN_CITY_LIST = [
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
];

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractCity(text: string | null): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const city of BERGEN_CITY_LIST) {
    if (lower.includes(city)) return titleCase(city);
  }
  return null;
}

// ─── HTML stripper ─────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeRssItem(
  item: RawRssItem,
  source: IcalSource,
): ImportedEvent | null {
  if (!item.title || !item.link) return null;
  if (!isEventLike(item)) return null;

  // Prefer explicit event start; fall back to pubDate
  const startDate =
    parseFeedDate(item.eventStart) ?? parseFeedDate(item.pubDate);
  if (!startDate) return null;

  // For RSS sources without explicit event dates, pubDate is the article
  // publish date. We include items published within the past 3 days
  // (article about upcoming event) or any future date.
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  if (!item.eventStart && startDate < cutoff) return null;

  const rawDesc = item.description ? stripHtml(item.description) : null;
  const shortDesc = rawDesc ? rawDesc.slice(0, 200) : null;

  const city =
    extractCity(item.location) ??
    extractCity(item.title) ??
    extractCity(rawDesc);

  const venue = item.location
    ? {
        name:    item.location.split(",")[0].trim(),
        address: item.location,
        city,
        lat: null,
        lng: null,
      }
    : city
    ? {
        name:    `${city}, NJ`,
        address: null,
        city,
        lat: null,
        lng: null,
      }
    : null;

  const externalId = item.guid ?? item.link;

  return {
    title:             item.title,
    short_description: shortDesc,
    description:       rawDesc,
    start_date:        startDate,
    end_date:          item.eventEnd ? parseFeedDate(item.eventEnd) : null,
    is_free:           false, // can't reliably determine from RSS text
    price_range:       null,
    external_url:      item.link,
    banner_url:        item.enclosureUrl,
    organizer_name:    source.name,
    source:            "rss",
    external_id:       `${source.id}:${externalId}`,
    venue,
    category_guess:    source.category_guess,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch one RSS or Atom feed and return ImportedEvent objects for event-like items.
 */
export async function fetchRssSource(source: IcalSource): Promise<ImportedEvent[]> {
  const res = await fetch(source.url, {
    headers: {
      "User-Agent": "BergenBeat/1.0 (events calendar aggregator)",
      Accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${source.url}`);

  const xml = await res.text();
  const rawItems = isAtom(xml) ? parseAtomEntries(xml) : parseRssItems(xml);

  return rawItems
    .map((item) => normalizeRssItem(item, source))
    .filter((e): e is ImportedEvent => e !== null);
}
