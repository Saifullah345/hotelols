-- ============================================================
-- Guest data cleanup — run once in the Supabase SQL Editor
-- Nulls out garbled names and country values in profiles and
-- hotel_guests. Review each UPDATE before applying; wrap in a
-- transaction and ROLLBACK first if you want to preview results.
-- ============================================================

BEGIN;

-- ── Profiles: garbled full_name ────────────────────────────────────
-- Matches names with 3+ consecutive non-letter chars (dashes, dots,
-- underscores, spaces), or names that contain digits, or names that
-- are shorter than 2 visible letters.
UPDATE profiles
SET full_name = NULL
WHERE
  full_name IS NOT NULL AND (
    full_name ~ '[-._]{3,}'          -- three or more consecutive separators
    OR full_name ~ '[0-9]'           -- contains any digit
    OR full_name !~ '[a-zA-ZÀ-ɏ]{2}'  -- fewer than 2 letters total
  );

-- ── Profiles: garbled country ──────────────────────────────────────
-- Matches values that start with a dash/dot, end with a dot, contain
-- two or more consecutive dashes/dots, or contain digits/symbols.
UPDATE profiles
SET country = NULL
WHERE
  country IS NOT NULL AND (
    country ~ '^[-.]'              -- starts with dash or dot
    OR country ~ '[.]$'            -- ends with a dot
    OR country ~ '[-]{2,}'         -- two or more consecutive dashes
    OR country ~ '[.]{2,}'         -- two or more consecutive dots
    OR country ~ '[0-9@#$%^&*]'    -- contains digits or symbols
  );

-- ── hotel_guests: garbled name ──────────────────────────────────────
UPDATE hotel_guests
SET name = 'Unknown'
WHERE
  name IS NOT NULL AND (
    name ~ '[-._]{3,}'
    OR name ~ '[0-9]{3,}'
    OR name !~ '[a-zA-ZÀ-ɏ]{2}'
  );

-- ── hotel_guests: garbled country ──────────────────────────────────
UPDATE hotel_guests
SET country = NULL
WHERE
  country IS NOT NULL AND (
    country ~ '^[-.]'
    OR country ~ '[.]$'
    OR country ~ '[-]{2,}'
    OR country ~ '[.]{2,}'
    OR country ~ '[0-9@#$%^&*]'
  );

-- Preview what was affected (run before COMMIT to verify):
-- SELECT id, full_name, country FROM profiles WHERE full_name IS NULL OR country IS NULL;
-- SELECT id, name, country FROM hotel_guests WHERE name = 'Unknown' OR country IS NULL;

COMMIT;
