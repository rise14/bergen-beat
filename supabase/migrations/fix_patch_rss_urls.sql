-- ─── Fix Patch.com RSS URLs ───────────────────────────────────────────────────
-- Run this if you already applied seed_rss_ical_sources.sql with the old
-- /local-events/rss URL format. This corrects them to the standard /rss format.
-- Safe to run multiple times (idempotent).

UPDATE ical_sources
SET url = REPLACE(url, '/local-events/rss', '/rss')
WHERE source_type = 'rss'
  AND url LIKE '%patch.com%/local-events/rss';

-- Also remove any guessed library iCal entries that were seeded with
-- placeholder LibCal API URLs (these never worked; add real ones manually).
DELETE FROM ical_sources
WHERE source_type = 'ical'
  AND url LIKE '%libcal.com/api/2.0/events%';

DELETE FROM ical_sources
WHERE url = 'https://calendar.bccls.org/events.ics';

DELETE FROM ical_sources
WHERE url LIKE '%google.com/calendar/ical%bergenpac%'
   OR url LIKE '%google.com/calendar/ical%bergencountyplayers%';
