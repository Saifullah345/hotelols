-- Add sort_order to rooms for manual ordering
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialize sort_order from existing room_number order per hotel
UPDATE rooms r
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY hotel_id ORDER BY room_number) - 1 AS rn
  FROM rooms
) sub
WHERE r.id = sub.id;
