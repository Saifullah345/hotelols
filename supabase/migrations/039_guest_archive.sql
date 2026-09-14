-- ============================================================================
-- Removing a guest from the directory.
--
-- The directory is two sources merged: `hotel_guests` rows the hotel typed in
-- itself, and one synthesised row per person who has ever booked here. Deleting
-- only ever touched the first kind, so "Remove" on a guest who exists because
-- they booked deleted the hotel's annotation row (or nothing at all, when there
-- wasn't one) and the guest was rebuilt from their bookings on the next load.
-- It looked exactly like a delete that doesn't work.
--
-- A booked guest can't be deleted — their bookings are the record, and the
-- modal already promises "their booking history remains intact". What "Remove"
-- means for them is: stop listing them. That is what this column records.
--
-- For a manually-added guest nothing changes: the row is still deleted outright.
-- ============================================================================

ALTER TABLE hotel_guests
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN hotel_guests.archived_at IS
  'Set when the hotel removed this guest from its directory. Booking-derived '
  'guests are hidden by an archived marker row rather than deleted, since the '
  'bookings they are built from stay.';

-- The directory reads "every non-archived row for this hotel".
CREATE INDEX IF NOT EXISTS idx_hotel_guests_hotel_active
  ON hotel_guests (hotel_id)
  WHERE archived_at IS NULL;
