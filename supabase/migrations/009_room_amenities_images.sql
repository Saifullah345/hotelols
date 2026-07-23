-- Amenities and photos move to the individual room, not just its type —
-- two rooms of the same "Deluxe" type can still differ in what they actually have.
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS amenities JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';

-- Seed every existing room from its room type so nothing looks empty
-- until an admin edits a specific room.
UPDATE rooms r
SET amenities = COALESCE(rt.amenities, '[]'::jsonb),
    images = COALESCE(rt.images, '[]'::jsonb)
FROM room_types rt
WHERE r.room_type_id = rt.id;
