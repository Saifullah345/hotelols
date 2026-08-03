-- Composite index for booking date-range overlap queries (availability checks)
CREATE INDEX IF NOT EXISTS idx_bookings_dates_status
  ON bookings (hotel_id, status, check_in, check_out);

-- Composite index for no-show / overdue detection (hotel_id + status + check_in)
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_status_checkin
  ON bookings (hotel_id, status, check_in);

-- Composite index for room listing + ordering by sort_order
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_sort
  ON rooms (hotel_id, sort_order, room_number);

-- Payment lookups by booking
CREATE INDEX IF NOT EXISTS idx_payments_booking_status
  ON payments (booking_id, status);

-- Booking lookups by user (customer bookings page)
CREATE INDEX IF NOT EXISTS idx_bookings_user
  ON bookings (user_id, created_at DESC);
