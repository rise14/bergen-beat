-- Add organizer_email to events so organizers can view their live listings
-- in the /organizer dashboard.
-- Run in Supabase SQL editor.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS organizer_email text;

CREATE INDEX IF NOT EXISTS events_organizer_email_idx ON events (organizer_email)
  WHERE organizer_email IS NOT NULL;
