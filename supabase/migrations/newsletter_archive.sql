-- Newsletter archive: stores metadata for each sent digest edition.
-- Run in the Supabase SQL editor.

create table if not exists newsletter_archive (
  id          uuid        primary key default gen_random_uuid(),
  type        text        not null check (type in ('weekly', 'weekend')),
  week_label  text        not null,           -- e.g. "May 9–15"
  event_ids   uuid[]      not null default '{}',
  sent_at     timestamptz not null default now(),
  sent_count  integer     not null default 0  -- number of subscribers who received it
);

alter table newsletter_archive enable row level security;

-- Public can read (powers the /newsletter archive page)
create policy "Public can read newsletter archive"
  on newsletter_archive for select
  to public
  using (true);

-- Only service role can insert/update
-- (our cron uses the admin client which bypasses RLS)
