-- Prevent checkout when the guest has an outstanding balance.
-- Blocks UPDATE bookings SET status = 'checked_out' if sum(completed payments) < total_amount.

CREATE OR REPLACE FUNCTION check_checkout_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_paid NUMERIC;
  outstanding NUMERIC;
BEGIN
  IF NEW.status = 'checked_out' AND OLD.status IS DISTINCT FROM 'checked_out' THEN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE booking_id = NEW.id AND status = 'completed';

    outstanding := NEW.total_amount - total_paid;

    IF outstanding > 0.009 THEN
      RAISE EXCEPTION 'Cannot check out: outstanding balance of % remains unpaid.', ROUND(outstanding::numeric, 2);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_checkout_balance
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_checkout_balance();
