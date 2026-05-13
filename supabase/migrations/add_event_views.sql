-- Event page view tracking
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS event_views (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  viewed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_views_event_id_idx ON event_views (event_id);
CREATE INDEX IF NOT EXISTS event_views_viewed_at_idx ON event_views (viewed_at DESC);

-- Composite index for "trending in last N days" queries
CREATE INDEX IF NOT EXISTS event_views_event_recent_idx ON event_views (event_id, viewed_at DESC);

-- Helper RPC: returns event_ids ranked by views in the last 7 days
CREATE OR REPLACE FUNCTION get_trending_event_ids(p_limit int DEFAULT 8)
RETURNS TABLE (event_id uuid, view_count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT ev.event_id, COUNT(*) AS view_count
  FROM event_views ev
  WHERE ev.viewed_at >= now() - interval '7 days'
  GROUP BY ev.event_id
  ORDER BY view_count DESC
  LIMIT p_limit;
$$;
