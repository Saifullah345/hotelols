-- Allow staff records without a linked user account (simple roster management)
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS name  TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Back-fill from the linked profile so existing staff keep their details
UPDATE staff s
SET    name  = p.full_name,
       email = p.email,
       phone = p.phone
FROM   profiles p
WHERE  s.user_id = p.id
AND    s.name IS NULL;

-- user_id is now optional — plain roster entries have no linked login
ALTER TABLE staff ALTER COLUMN user_id DROP NOT NULL;
