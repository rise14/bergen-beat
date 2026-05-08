-- Add slug column to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slugs for existing venues using name + city to disambiguate
-- e.g. "Hackensack Public Library" -> "hackensack-public-library"
-- e.g. "The Fillmore" in Paramus -> "the-fillmore-paramus"
UPDATE venues
SET slug = (
  lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          trim(name || CASE WHEN city IS NOT NULL THEN '-' || city ELSE '' END),
          '[^a-zA-Z0-9\s\-]', '', 'g'
        ),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  )
)
WHERE slug IS NULL;

-- If two venues ended up with the same slug, append a short unique suffix
UPDATE venues v
SET slug = v.slug || '-' || substr(v.id::text, 1, 6)
WHERE (
  SELECT count(*) FROM venues v2 WHERE v2.slug = v.slug
) > 1;

-- Enforce uniqueness going forward
CREATE UNIQUE INDEX IF NOT EXISTS venues_slug_idx ON venues (slug);

-- Make slug NOT NULL now that it's backfilled
ALTER TABLE venues ALTER COLUMN slug SET NOT NULL;
