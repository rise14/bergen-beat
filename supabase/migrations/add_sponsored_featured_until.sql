-- Add sponsored listing and featured expiry fields to events
-- Run in Supabase SQL editor

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until date;

-- Index so we can quickly find currently-sponsored events
CREATE INDEX IF NOT EXISTS events_is_sponsored_idx ON events (is_sponsored)
  WHERE is_sponsored = true;

COMMENT ON COLUMN events.is_sponsored IS 'Paid sponsored listing — shown with Sponsored badge and injected into digest emails';
COMMENT ON COLUMN events.featured_until IS 'If set, the event will be unfeatured automatically after this date (handled by the expire cron)';
