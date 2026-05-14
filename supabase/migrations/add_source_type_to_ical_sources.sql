-- ─── Add source_type to ical_sources ─────────────────────────────────────────
-- Allows the same table to store both iCal (.ics) and RSS / Atom feed URLs.
-- Existing rows default to 'ical' so no data migration is needed.

ALTER TABLE ical_sources
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'ical';

ALTER TABLE ical_sources
  DROP CONSTRAINT IF EXISTS ical_sources_source_type_check;

ALTER TABLE ical_sources
  ADD CONSTRAINT ical_sources_source_type_check
  CHECK (source_type IN ('ical', 'rss'));
