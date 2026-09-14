-- ============================================================================
-- Make the double-booking guard understand short stays.
--
-- check_room_availability() compares calendar dates only:
--
--     AND check_in  <  NEW.check_out
--     AND check_out >  NEW.check_in
--
-- An hourly booking has check_in = check_out (migration 036 relaxed check_dates
-- to allow it), so for two short stays on the same day both halves are false
-- and the trigger waves them through — two guests, one room, overlapping hours.
-- The API's own check (src/lib/hourly.ts, staysOverlap) does catch it, but the
-- trigger is what protects rows that arrive by any other route, and it is the
-- only guard against two requests racing each other.
--
-- So the comparison moves from dates to the moments a reservation actually
-- occupies: [check_in + check_in_time, check_out + check_out_time) for an
-- hourly stay, [check_in 00:00, check_out 00:00) for a nightly one. For a
-- nightly booking that is the same arithmetic as before, so nothing that used
-- to be accepted stops being accepted.
-- ============================================================================

-- The half-open interval a reservation holds the room for.
CREATE OR REPLACE FUNCTION booking_occupied_range(
  p_booking_type   TEXT,
  p_check_in       DATE,
  p_check_out      DATE,
  p_check_in_time  TIME,
  p_check_out_time TIME
)
RETURNS TSRANGE AS $$
  SELECT CASE
    WHEN p_booking_type = 'hourly' THEN
      tsrange(
        p_check_in  + COALESCE(p_check_in_time,  TIME '00:00'),
        p_check_out + COALESCE(p_check_out_time, TIME '00:00'),
        '[)'
      )
    ELSE
      tsrange(p_check_in::TIMESTAMP, p_check_out::TIMESTAMP, '[)')
  END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION check_room_availability()
RETURNS TRIGGER AS $$
DECLARE
  new_range TSRANGE;
BEGIN
  -- A cancelled or checked-out booking doesn't hold a room, so it must always
  -- be allowed through — otherwise legacy overlaps make bookings uncancellable.
  IF NEW.status IN ('cancelled', 'checked_out') THEN
    RETURN NEW;
  END IF;

  -- Only re-check when something that affects availability actually changed.
  -- Editing a guest name or special request shouldn't re-validate the room.
  IF TG_OP = 'UPDATE'
     AND NEW.room_ids       IS NOT DISTINCT FROM OLD.room_ids
     AND NEW.check_in       IS NOT DISTINCT FROM OLD.check_in
     AND NEW.check_out      IS NOT DISTINCT FROM OLD.check_out
     AND NEW.status         IS NOT DISTINCT FROM OLD.status
     AND NEW.booking_type   IS NOT DISTINCT FROM OLD.booking_type
     AND NEW.check_in_time  IS NOT DISTINCT FROM OLD.check_in_time
     AND NEW.check_out_time IS NOT DISTINCT FROM OLD.check_out_time
  THEN
    RETURN NEW;
  END IF;

  new_range := booking_occupied_range(
    NEW.booking_type, NEW.check_in, NEW.check_out, NEW.check_in_time, NEW.check_out_time
  );

  -- An empty range can't clash with anything; the API rejects the times that
  -- produce one before it ever gets here.
  IF isempty(new_range) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.room_ids && NEW.room_ids
      AND b.id != NEW.id
      AND b.status IN ('confirmed', 'checked_in')
      -- Cheap date prefilter so the GIN/date indexes still do the work; the
      -- range comparison then decides. Inclusive, because a same-day hourly
      -- stay has check_in = check_out and a strict window would skip it.
      AND b.check_in  <= NEW.check_out
      AND b.check_out >= NEW.check_in
      AND booking_occupied_range(
            b.booking_type, b.check_in, b.check_out, b.check_in_time, b.check_out_time
          ) && new_range
  ) THEN
    RAISE EXCEPTION 'One or more rooms are already booked for these dates';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
