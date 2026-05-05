-- ============================================================
-- Bergen Beat — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── Helpers ────────────────────────────────────────────────

-- Auto-update updated_at on any table that has it
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- CATEGORIES
-- ============================================================

create table if not exists categories (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  icon        text,                         -- emoji, e.g. '🎵'
  color       text,                         -- hex, e.g. '#6366f1'
  sort_order  integer     not null default 0
);

alter table categories enable row level security;

-- Public can read categories
create policy "categories_public_read"
  on categories for select
  using (true);


-- ============================================================
-- NEIGHBORHOODS
-- ============================================================

create table if not exists neighborhoods (
  id    uuid  primary key default gen_random_uuid(),
  name  text  not null,
  slug  text  not null unique,
  city  text
);

alter table neighborhoods enable row level security;

create policy "neighborhoods_public_read"
  on neighborhoods for select
  using (true);


-- ============================================================
-- VENUES
-- ============================================================

create table if not exists venues (
  id               uuid     primary key default gen_random_uuid(),
  name             text     not null,
  address          text,
  city             text,
  state            text     not null default 'NJ',
  zip              text,
  lat              numeric(10, 7),
  lng              numeric(10, 7),
  neighborhood_id  uuid     references neighborhoods (id) on delete set null,
  website          text,
  created_at       timestamptz not null default now()
);

alter table venues enable row level security;

create policy "venues_public_read"
  on venues for select
  using (true);

create index venues_neighborhood_idx on venues (neighborhood_id);


-- ============================================================
-- EVENTS
-- ============================================================

create table if not exists events (
  id                  uuid        primary key default gen_random_uuid(),
  title               text        not null,
  slug                text        not null unique,
  description         text,
  short_description   text,
  status              text        not null default 'draft'
                        check (status in ('draft', 'published', 'archived')),
  is_free             boolean     not null default false,
  price_range         text,
  external_url        text,
  category_id         uuid        references categories (id) on delete set null,
  venue_id            uuid        references venues (id) on delete set null,
  neighborhood_id     uuid        references neighborhoods (id) on delete set null,
  start_date          timestamptz not null,
  end_date            timestamptz,
  is_recurring        boolean     not null default false,
  recurrence_note     text,
  banner_url          text,
  organizer_name      text,
  organizer_email     text,
  featured            boolean     not null default false,
  source              text        not null default 'admin'
                        check (source in ('admin', 'submission', 'ticketmaster', 'predicthq')),
  external_id         text,       -- external API event ID for deduplication
  submission_id       uuid,       -- set when promoted from event_submissions
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table events enable row level security;

-- Public can read published events only
create policy "events_public_read"
  on events for select
  using (status = 'published');

-- Only service role (used server-side) can write
-- No insert/update/delete policy needed for anon — server code uses service role key

-- Auto-update updated_at
create trigger events_updated_at
  before update on events
  for each row execute function handle_updated_at();

-- Indexes for common query patterns
create index events_status_start_idx   on events (status, start_date);
create index events_category_idx       on events (category_id);
create index events_neighborhood_idx   on events (neighborhood_id);
create index events_featured_idx       on events (featured) where featured = true;
create index events_slug_idx           on events (slug);

-- Full-text search index on title (for the query filter)
create index events_title_fts_idx
  on events using gin (to_tsvector('english', title));


-- ============================================================
-- EVENT SUBMISSIONS
-- Holds community-submitted events before editorial review.
-- ============================================================

create table if not exists event_submissions (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  description      text,
  is_free          boolean     not null default false,
  price_range      text,
  external_url     text,
  category_id      uuid        references categories (id) on delete set null,
  venue_name       text        not null,
  venue_address    text,
  start_date       timestamptz not null,
  end_date         timestamptz,
  organizer_name   text        not null,
  organizer_email  text        not null,
  banner_url       text,
  status           text        not null default 'pending'
                     check (status in ('pending', 'approved', 'rejected')),
  admin_notes      text,
  reviewed_at      timestamptz,
  reviewed_by      uuid,       -- auth.users.id of the admin who reviewed
  created_at       timestamptz not null default now()
);

alter table event_submissions enable row level security;

-- Anyone can insert a submission (public form)
create policy "submissions_public_insert"
  on event_submissions for insert
  with check (true);

-- Only service role can read/update submissions (admin dashboard uses service role)


-- ============================================================
-- NEWSLETTER SUBSCRIBERS
-- ============================================================

create table if not exists newsletter_subscribers (
  id             uuid        primary key default gen_random_uuid(),
  email          text        not null unique,
  confirmed      boolean     not null default false,
  token          text,                       -- double opt-in confirmation token
  subscribed_at  timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;

-- Anyone can insert their own email (subscribe form)
create policy "subscribers_public_insert"
  on newsletter_subscribers for insert
  with check (true);

-- Only service role can read/manage subscribers


-- ============================================================
-- TAGS  (optional, Phase 1.5)
-- Cross-cutting labels: dog-friendly, all-ages, indoor, etc.
-- ============================================================

create table if not exists tags (
  id    uuid  primary key default gen_random_uuid(),
  name  text  not null unique,
  slug  text  not null unique
);

create table if not exists event_tags (
  event_id  uuid  not null references events (id) on delete cascade,
  tag_id    uuid  not null references tags (id) on delete cascade,
  primary key (event_id, tag_id)
);

alter table tags enable row level security;
alter table event_tags enable row level security;

create policy "tags_public_read"        on tags        for select using (true);
create policy "event_tags_public_read"  on event_tags  for select using (true);


-- ============================================================
-- IMPORT LOG
-- Tracks every event fetched from external APIs so we never
-- create duplicates.  One row per (source, external_id) pair.
-- ============================================================

create table if not exists import_log (
  id            uuid        primary key default gen_random_uuid(),
  source        text        not null check (source in ('ticketmaster', 'predicthq')),
  external_id   text        not null,
  event_id      uuid        references events (id) on delete set null,
  status        text        not null default 'imported'
                              check (status in ('imported', 'skipped', 'error')),
  raw_data      jsonb,
  imported_at   timestamptz not null default now(),
  unique (source, external_id)
);

alter table import_log enable row level security;
-- No public access; only service role reads/writes import_log

create index import_log_source_idx on import_log (source);
create index import_log_imported_at_idx on import_log (imported_at desc);


-- ============================================================
-- SEED DATA — Categories
-- ============================================================

insert into categories (name, slug, icon, color, sort_order) values
  ('Music',            'music',           '🎵', '#6366f1', 1),
  ('Food & Drink',     'food-drink',      '🍕', '#f97316', 2),
  ('Arts & Culture',   'arts-culture',    '🎨', '#ec4899', 3),
  ('Outdoors',         'outdoors',        '🌳', '#22c55e', 4),
  ('Sports & Fitness', 'sports-fitness',  '🏃', '#3b82f6', 5),
  ('Community',        'community',       '🤝', '#8b5cf6', 6),
  ('Kids & Family',    'kids-family',     '👨‍👩‍👧', '#facc15', 7),
  ('Comedy',           'comedy',          '😂', '#fb923c', 8),
  ('Film & Media',     'film-media',      '🎬', '#64748b', 9),
  ('Nightlife',        'nightlife',       '🌙', '#1e293b', 10),
  ('Markets & Fairs',  'markets-fairs',   '🛍',  '#a16207', 11),
  ('Wellness',         'wellness',        '🧘', '#14b8a6', 12)
on conflict (slug) do nothing;


-- ============================================================
-- SEED DATA — Neighborhoods
-- ============================================================

insert into neighborhoods (name, slug, city) values
  ('Hackensack',        'hackensack',        'Hackensack'),
  ('Ridgewood',         'ridgewood',         'Ridgewood'),
  ('Paramus',           'paramus',           'Paramus'),
  ('Fort Lee',          'fort-lee',          'Fort Lee'),
  ('Teaneck',           'teaneck',           'Teaneck'),
  ('Englewood',         'englewood',         'Englewood'),
  ('Bergenfield',       'bergenfield',       'Bergenfield'),
  ('Closter',           'closter',           'Closter'),
  ('Mahwah',            'mahwah',            'Mahwah'),
  ('Ramsey',            'ramsey',            'Ramsey'),
  ('Westwood',          'westwood',          'Westwood'),
  ('Oradell',           'oradell',           'Oradell'),
  ('Other Bergen County', 'other',           null)
on conflict (slug) do nothing;


-- ============================================================
-- SEED DATA — Sample event (so the homepage isn't empty)
-- ============================================================

-- Insert a sample venue first
with inserted_venue as (
  insert into venues (name, address, city, state, zip, lat, lng)
  values ('Hackensack Cultural Center', '65 Central Ave', 'Hackensack', 'NJ', '07601', 40.8859, -74.0435)
  returning id
),
inserted_category as (
  select id from categories where slug = 'music' limit 1
),
inserted_neighborhood as (
  select id from neighborhoods where slug = 'hackensack' limit 1
)
insert into events (
  title, slug, short_description, description,
  status, is_free, price_range, external_url,
  category_id, venue_id, neighborhood_id,
  start_date, end_date, organizer_name, featured, source, published_at
)
select
  'Bergen County Jazz Night',
  'bergen-county-jazz-night',
  'An evening of live jazz featuring local Bergen County musicians.',
  'Join us for a wonderful evening of live jazz at the Hackensack Cultural Center. Featuring local Bergen County musicians performing classics and originals. Light refreshments available.',
  'published',
  false,
  '$15–$25',
  'https://example.com/tickets',
  (select id from inserted_category),
  (select id from inserted_venue),
  (select id from inserted_neighborhood),
  (now() + interval '7 days')::timestamptz,
  (now() + interval '7 days' + interval '3 hours')::timestamptz,
  'Bergen Beat',
  true,
  'admin',
  now()
where not exists (select 1 from events where slug = 'bergen-county-jazz-night');
