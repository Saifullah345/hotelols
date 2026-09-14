-- ============================================================================
-- rooms.image_count — the column src/lib/rooms-list.ts has always asked for.
--
-- `rooms.images` is a JSONB array of base64 data URLs (the room forms embed the
-- photo itself, not a link to one): roughly 30 KB for the first photo and
-- 180 KB for the second, per room. Any list screen that does `select('*')` — or
-- that has to fall back to selecting `images` — drags every byte of that out of
-- Postgres and across the wire before a single room can be drawn.
--
-- selectRoomList() avoids it by asking for `images->>0` (the one thumbnail it
-- draws) plus `image_count` (the "N photos" badge). That column was never
-- created, so PostgREST answered 42703 and the helper fell back to the legacy
-- shape — the full array — on every load, in both apps. This creates it, which
-- is what actually turns the slim path on.
--
-- Generated + STORED so it costs nothing to read and stays correct on write.
-- jsonb_array_length() is IMMUTABLE, but it raises on a non-array, so the
-- typeof guard keeps a legacy row holding `null`/an object from breaking the
-- whole table.
-- ============================================================================

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS image_count INTEGER
    GENERATED ALWAYS AS (
      CASE WHEN jsonb_typeof(images) = 'array' THEN jsonb_array_length(images) ELSE 0 END
    ) STORED;

-- Same column on room_types: the type pickers read photo counts the same way.
ALTER TABLE room_types
  ADD COLUMN IF NOT EXISTS image_count INTEGER
    GENERATED ALWAYS AS (
      CASE WHEN jsonb_typeof(images) = 'array' THEN jsonb_array_length(images) ELSE 0 END
    ) STORED;
