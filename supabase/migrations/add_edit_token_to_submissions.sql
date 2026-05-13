-- Add edit_token to event_submissions so organizers can edit their events
-- after approval via a secure link emailed to them.

alter table event_submissions
  add column if not exists edit_token uuid not null default gen_random_uuid();

-- Index for fast token lookups on the edit page
create unique index if not exists event_submissions_edit_token_idx
  on event_submissions (edit_token);
