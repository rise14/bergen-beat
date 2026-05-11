-- Run this in the Supabase SQL Editor to add subscriber preferences support.

alter table newsletter_subscribers
  add column if not exists token_expires_at  timestamptz,
  add column if not exists unsubscribed_at   timestamptz,
  add column if not exists preferences       jsonb not null default '{}';

-- Index for fast token lookups (preferences page, unsubscribe)
create index if not exists newsletter_subscribers_token_idx
  on newsletter_subscribers (token)
  where token is not null;
