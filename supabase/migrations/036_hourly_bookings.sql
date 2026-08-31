-- Add hourly / short-stay booking support

-- New columns on bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_type   TEXT    NOT NULL DEFAULT 'nightly'
    CONSTRAINT bookings_booking_type_check CHECK (booking_type IN ('nightly', 'hourly')),
  ADD COLUMN IF NOT EXISTS check_in_time  TIME,
  ADD COLUMN IF NOT EXISTS check_out_time TIME;

-- Hourly rate on rooms (nullable — only set when the hotel offers hourly stays)
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS rate_per_hour  NUMERIC(10, 2);

-- Relax the date constraint: same-day (check_out = check_in) is now valid for hourly bookings
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS check_dates;

ALTER TABLE bookings
  ADD CONSTRAINT check_dates CHECK (check_out >= check_in);
