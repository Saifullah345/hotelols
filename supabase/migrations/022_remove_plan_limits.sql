-- Remove plan-based limits (rooms and staff)
-- These limits are no longer enforced at the application or database level.

-- Drop staff limit trigger and function
DROP TRIGGER IF EXISTS enforce_staff_limit ON staff;
DROP FUNCTION IF EXISTS check_staff_limit();
