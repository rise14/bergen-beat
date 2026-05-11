-- iCal feed sources for Bergen Beat
-- Each row is a public .ics URL we poll for events.
-- Run this in the Supabase SQL editor.

create table if not exists ical_sources (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  url             text        not null unique,
  category_guess  text,
  enabled         boolean     not null default true,
  last_fetched_at timestamptz,
  created_at      timestamptz not null default now()
);

alter table ical_sources enable row level security;

-- Only service-role (admin) can read/write
create policy "ical_sources_service_only"
  on ical_sources
  using (false);          -- public reads blocked; admin client bypasses RLS
