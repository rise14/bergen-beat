-- ─── Seed known Bergen County calendar sources ───────────────────────────────
-- Run AFTER add_source_type_to_ical_sources.sql
--
-- All sources start as enabled = false. Enable and test one at a time
-- in /admin/import before turning on in bulk.
--
-- NOTE: Patch.com no longer exposes public RSS feeds — those seeds have been
-- removed. Use the iCal feeds below instead.

-- ── mybergen.com — the best single Bergen County events iCal ─────────────────
-- mybergen.com publishes a Bergen County community events calendar via
-- The Events Calendar plugin (Tribe). Their iCal export is public and free.

INSERT INTO ical_sources (name, url, source_type, category_guess, enabled)
VALUES
  ('MyBergen.com Events Calendar',
    'https://www.mybergen.com/local-events-calendar-nj-northern-new-jersey-bergen-county/list/?ical=1',
    'ical', 'community', false)
ON CONFLICT DO NOTHING;

-- ── Bergen County Library iCal Feeds ─────────────────────────────────────────
-- Libraries use LibCal (Springshare). The iCal URL for each library must be
-- found manually on their events page — look for "Subscribe" or "Add to Calendar".
-- The URL pattern is typically:
--   https://<org>.libcal.com/calendar/<cal_id>?ical=1
-- or via their "Export iCal" link on the calendar page.
--
-- Do NOT use the API endpoint (/api/2.0/events) — that requires auth.
-- Use the PUBLIC calendar subscribe link instead.
--
-- Examples to look up manually and add via /admin/import:
--   Hackensack Public Library  → hackensacklibrary.org/events
--   Ridgewood Public Library   → ridgewoodlibrary.org/events
--   Paramus Public Library     → paramuslibrary.org/calendar
--   Englewood Public Library   → englewoodlibrary.org/events
--   Teaneck Public Library     → teanecklibrary.org/events
--   Fair Lawn Public Library   → fairlawnpl.org/events
--   Mahwah Public Library      → mahwahlibrary.org/events
--   Ramsey Free Public Library → ramseylibrary.org/events

-- ── Note on Patch.com ─────────────────────────────────────────────────────────
-- Patch.com removed public RSS feeds. They are not accessible without
-- third-party scraping services. Use mybergen.com above instead.
