-- ─── Extend source check constraints to include 'ical' and 'rss' ─────────────
-- The original schema only allowed 'ticketmaster' and 'predicthq' as import
-- sources. This migration widens both constraints to include iCal and RSS feeds.

-- events.source
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_source_check;

ALTER TABLE events
  ADD CONSTRAINT events_source_check
  CHECK (source IN ('admin', 'submission', 'ticketmaster', 'predicthq', 'ical', 'rss'));

-- import_log.source
ALTER TABLE import_log
  DROP CONSTRAINT IF EXISTS import_log_source_check;

ALTER TABLE import_log
  ADD CONSTRAINT import_log_source_check
  CHECK (source IN ('ticketmaster', 'predicthq', 'ical', 'rss'));
