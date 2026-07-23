-- Prevent duplicate room type names within the same hotel (case-insensitive) —
-- the "Add new room type" form let admins create the same type twice.
CREATE UNIQUE INDEX IF NOT EXISTS room_types_hotel_name_unique
  ON room_types (hotel_id, lower(name));
