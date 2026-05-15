-- ─── Remove non-working Patch.com RSS seeds ──────────────────────────────────
-- Patch.com no longer exposes public RSS feeds. All seeded Patch entries
-- return 404 and should be removed.
-- Safe to run multiple times (idempotent).

DELETE FROM ical_sources
WHERE source_type = 'rss'
  AND url LIKE '%patch.com%';

-- Remove any guessed LibCal API URLs that were seeded — these require auth.
DELETE FROM ical_sources
WHERE url LIKE '%libcal.com/api/2.0/events%';

-- Remove other guessed URLs that don't work.
DELETE FROM ical_sources
WHERE url = 'https://calendar.bccls.org/events.ics';

DELETE FROM ical_sources
WHERE url LIKE '%google.com/calendar/ical%bergenpac%'
   OR url LIKE '%google.com/calendar/ical%bergencountyplayers%';

-- ─── Add the working mybergen.com iCal feed ───────────────────────────────────
-- mybergen.com is a Bergen County community events site that publishes a
-- public iCal export. This is currently the best free iCal source available.

INSERT INTO ical_sources (name, url, source_type, category_guess, enabled)
VALUES
  ('MyBergen.com Events Calendar',
    'https://www.mybergen.com/local-events-calendar-nj-northern-new-jersey-bergen-county/list/?ical=1',
    'ical', 'community', false)
ON CONFLICT DO NOTHING;
