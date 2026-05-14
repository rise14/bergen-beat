-- ─── Seed known Bergen County calendar & RSS sources ─────────────────────────
-- Run AFTER add_source_type_to_ical_sources.sql
--
-- All sources start as enabled = false. Enable them one at a time in
-- /admin/import after verifying each URL returns real data.
--
-- PATCH.COM RSS:
--   The general-news RSS at /rss includes event articles tagged "Events".
--   The importer filters these via category/keyword detection automatically.
--   URL format: https://patch.com/new-jersey/<town>/rss

-- ── Patch.com RSS Feeds (Bergen County towns) ─────────────────────────────────

INSERT INTO ical_sources (name, url, source_type, category_guess, enabled)
VALUES
  ('Patch – Hackensack',          'https://patch.com/new-jersey/hackensack/rss',           'rss', 'community', false),
  ('Patch – Ridgewood',           'https://patch.com/new-jersey/ridgewood/rss',            'rss', 'community', false),
  ('Patch – Paramus',             'https://patch.com/new-jersey/paramus/rss',              'rss', 'community', false),
  ('Patch – Fort Lee',            'https://patch.com/new-jersey/fort-lee/rss',             'rss', 'community', false),
  ('Patch – Teaneck',             'https://patch.com/new-jersey/teaneck/rss',              'rss', 'community', false),
  ('Patch – Englewood',           'https://patch.com/new-jersey/englewood/rss',            'rss', 'community', false),
  ('Patch – Bergenfield',         'https://patch.com/new-jersey/bergenfield/rss',          'rss', 'community', false),
  ('Patch – Fair Lawn',           'https://patch.com/new-jersey/fair-lawn/rss',            'rss', 'community', false),
  ('Patch – Mahwah',              'https://patch.com/new-jersey/mahwah/rss',               'rss', 'community', false),
  ('Patch – Ramsey',              'https://patch.com/new-jersey/ramsey/rss',               'rss', 'community', false),
  ('Patch – Westwood',            'https://patch.com/new-jersey/westwood/rss',             'rss', 'community', false),
  ('Patch – Closter',             'https://patch.com/new-jersey/closter/rss',              'rss', 'community', false),
  ('Patch – Edgewater',           'https://patch.com/new-jersey/edgewater/rss',            'rss', 'community', false),
  ('Patch – Glen Rock',           'https://patch.com/new-jersey/glen-rock/rss',            'rss', 'community', false),
  ('Patch – Wyckoff',             'https://patch.com/new-jersey/wyckoff/rss',              'rss', 'community', false),
  ('Patch – Rutherford',          'https://patch.com/new-jersey/rutherford/rss',           'rss', 'community', false),
  ('Patch – Lyndhurst',           'https://patch.com/new-jersey/lyndhurst/rss',            'rss', 'community', false),
  ('Patch – Garfield',            'https://patch.com/new-jersey/garfield/rss',             'rss', 'community', false),
  ('Patch – Lodi',                'https://patch.com/new-jersey/lodi/rss',                 'rss', 'community', false),
  ('Patch – Tenafly',             'https://patch.com/new-jersey/tenafly/rss',              'rss', 'community', false),
  ('Patch – Palisades Park',      'https://patch.com/new-jersey/palisades-park/rss',       'rss', 'community', false),
  ('Patch – Waldwick',            'https://patch.com/new-jersey/waldwick/rss',             'rss', 'community', false),
  ('Patch – Park Ridge',          'https://patch.com/new-jersey/park-ridge/rss',           'rss', 'community', false),
  ('Patch – River Edge',          'https://patch.com/new-jersey/river-edge/rss',           'rss', 'community', false),
  ('Patch – Oradell',             'https://patch.com/new-jersey/oradell/rss',              'rss', 'community', false),
  ('Patch – New Milford',         'https://patch.com/new-jersey/new-milford/rss',          'rss', 'community', false),
  ('Patch – Hillsdale',           'https://patch.com/new-jersey/hillsdale/rss',            'rss', 'community', false),
  ('Patch – Montvale',            'https://patch.com/new-jersey/montvale/rss',             'rss', 'community', false),
  ('Patch – Old Tappan',          'https://patch.com/new-jersey/old-tappan/rss',           'rss', 'community', false),
  ('Patch – Woodcliff Lake',      'https://patch.com/new-jersey/woodcliff-lake/rss',       'rss', 'community', false)
ON CONFLICT DO NOTHING;

-- ── Note on iCal / Library Feeds ──────────────────────────────────────────────
-- Library iCal feeds (LibCal, Springshare) cannot be auto-discovered.
-- Each library's "Subscribe to iCal" link is unique and must be found manually
-- on their events/calendar page. To add one:
--   1. Go to the library's events page (e.g., hackensacklibrary.org/events)
--   2. Look for "Add to Calendar", "Subscribe", or "iCal Export" link
--   3. Copy the .ics URL and add it via /admin/import → Add Feed → iCal type
--
-- bergenPAC, arts councils, and venue Google Calendars follow the same process:
--   Google Calendar → Settings → "Secret address in iCal format" (copy that URL)
