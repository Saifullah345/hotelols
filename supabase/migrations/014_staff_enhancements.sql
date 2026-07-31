-- Add shift schedule, salary, and richer status to staff members
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS shift  TEXT CHECK (shift  IN ('Morning', 'Evening', 'Night')),
  ADD COLUMN IF NOT EXISTS salary NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'on_leave', 'inactive'));

-- Back-fill status from the existing boolean flag
UPDATE staff
SET    status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END
WHERE  status IS NULL;
