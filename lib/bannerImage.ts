/**
 * Shared banner-image guard for Bergen Beat.
 *
 * Ahrefs Site Audit flagged "Image file size too large" (Critical) on
 * www.bergenbeat.net: a Ticketmaster banner served at 5,771,564 bytes
 * (5.5 MB PNG) embedded on 9 crawled pages. The cause was an importer picking
 * Ticketmaster's `_SOURCE` asset — the uncompressed master original — instead
 * of a retail variant such as RETINA_LANDSCAPE_16_9 (1136px).
 *
 * `lib/importers/ticketmaster.ts` picks correctly now, but that fix is
 * Ticketmaster-specific and selection-time only: RSS enclosures, iCal
 * `raw.image`, event submissions and admin-pasted URLs all still land in
 * `events.banner_url` verbatim. This module is the write-time guard, applied at
 * every point where a banner URL is persisted, so an oversized master can't be
 * reintroduced from any source.
 *
 * The check is URL-shape only — deliberately no network fetch, since these run
 * inside request/import paths where a HEAD per event would be too costly.
 */

/** Largest width we ever render (matches next.config.js deviceSizes). */
export const MAX_BANNER_WIDTH = 1920;

/**
 * URL markers for uncompressed master/original assets across the CDNs we pull
 * from. These are the variants that ship multi-megabyte files.
 */
const MASTER_ASSET_PATTERNS: RegExp[] = [
  // Ticketmaster DAM master, e.g. ..._SOURCE or ..._SOURCE?foo=bar
  /_SOURCE(\b|$|\?)/i,
  // Common "give me the untouched original" markers
  /_ORIGINAL(\b|$|\?)/i,
  /\/original\//i,
];

/**
 * Width hints embedded in a URL, e.g. `..._2400x1350.jpg`, `?w=4000`,
 * `&width=3000`. Returns the largest width found, or null when none.
 */
function inferWidthFromUrl(url: string): number | null {
  const widths: number[] = [];

  // `_2400x1350` / `-2400x1350`
  for (const m of url.matchAll(/[_-](\d{3,5})x\d{3,5}\b/g)) {
    widths.push(parseInt(m[1], 10));
  }

  // `?w=1920` / `&width=1920`
  for (const m of url.matchAll(/[?&](?:w|width)=(\d{3,5})\b/gi)) {
    widths.push(parseInt(m[1], 10));
  }

  if (!widths.length) return null;
  return Math.max(...widths);
}

/**
 * True when the URL looks like an uncompressed master asset or is wider than
 * anything we render.
 */
export function isOversizedBannerUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  if (MASTER_ASSET_PATTERNS.some((re) => re.test(url))) return true;

  const width = inferWidthFromUrl(url);
  if (width !== null && width > MAX_BANNER_WIDTH) return true;

  return false;
}

/**
 * Normalise a banner URL before it is written to `events.banner_url`.
 *
 * Returns the URL unchanged when it's acceptable, and `null` when it's an
 * oversized master — callers treat null as "no banner", which downstream code
 * already handles (Unsplash fallback in lib/importers/images.ts, or a gradient
 * placeholder in the card/hero components). Dropping the banner is far
 * preferable to shipping a multi-megabyte download.
 *
 * @param context optional label included in the warning log, e.g. "admin:createEvent"
 */
export function sanitizeBannerUrl(
  url: string | null | undefined,
  context?: string
): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (isOversizedBannerUrl(trimmed)) {
    console.warn(
      `[bannerImage] Rejected oversized banner URL${context ? ` (${context})` : ""}: ${trimmed}`
    );
    return null;
  }

  return trimmed;
}
