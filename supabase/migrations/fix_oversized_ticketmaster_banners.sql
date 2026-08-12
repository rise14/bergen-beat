-- ─── Clear oversized Ticketmaster `_SOURCE` banner images ────────────────────
-- Ahrefs Site Audit flagged "Image file size too large" (Critical) on
-- www.bergenbeat.net: a single Ticketmaster banner served at 5,771,564 bytes
-- (5.5 MB PNG) and embedded on 23 pages (event, venue and events-listing pages).
--
-- Cause: lib/importers/ticketmaster.ts pickBestImage() sorted candidates by
-- width descending, which always selected Ticketmaster's `_SOURCE` asset —
-- the uncompressed master original — instead of a retail variant such as
-- RETINA_LANDSCAPE_16_9 (1136px) or TABLET_LANDSCAPE_16_9 (1024px).
-- The importer is fixed, but rows already saved still point at `_SOURCE`.
--
-- This migration nulls those banner_urls. Events then either get an Unsplash
-- fallback (lib/importers/images.ts) or render with no banner — both far
-- preferable to a multi-megabyte download. Re-running the Ticketmaster import
-- after this repopulates them with correctly-sized variants.
--
-- Safe to run multiple times (idempotent).

UPDATE events
SET banner_url = NULL
WHERE banner_url ILIKE '%\_SOURCE%';

-- Verify: should return 0 rows after running.
-- SELECT id, slug, banner_url FROM events WHERE banner_url ILIKE '%\_SOURCE%';
