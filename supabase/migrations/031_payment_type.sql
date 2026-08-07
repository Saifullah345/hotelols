-- Add payment_type column to payments so advance/partial payments are tracked.
-- Values: full | advance | partial | balance
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_type TEXT
    CHECK (payment_type IN ('full', 'advance', 'partial', 'balance'))
    DEFAULT 'full';
