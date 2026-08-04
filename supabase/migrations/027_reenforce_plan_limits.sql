-- Re-enforce plan-based limits (removed in 022, now restored with new plan tiers).
-- Starter: 15 rooms / 5 staff   |   Growth: 60 rooms / 20 staff
-- Pro / Enterprise: unlimited (-1)

-- Staff limit trigger (application-level check in the API is the primary guard;
-- this trigger is the safety net so direct DB writes are also blocked).
CREATE OR REPLACE FUNCTION check_staff_limit()
RETURNS TRIGGER AS $$
DECLARE
  plan_max_staff INTEGER;
  plan_name      TEXT;
  current_count  INTEGER;
BEGIN
  SELECT p.max_staff, p.name INTO plan_max_staff, plan_name
  FROM hotels h JOIN plans p ON h.plan_id = p.id
  WHERE h.id = NEW.hotel_id;

  -- -1 or NULL means unlimited
  IF plan_max_staff IS NULL OR plan_max_staff = -1 THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO current_count
  FROM staff
  WHERE hotel_id = NEW.hotel_id AND is_active = true;

  IF current_count >= plan_max_staff THEN
    RAISE EXCEPTION 'Staff limit reached. Your % plan allows up to % active staff members. Upgrade your plan to add more.',
      plan_name, plan_max_staff;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_staff_limit
  BEFORE INSERT ON staff
  FOR EACH ROW EXECUTE FUNCTION check_staff_limit();
