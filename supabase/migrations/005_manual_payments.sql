-- Add notes field for manual payment references (cheque no, transfer ref, etc.)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_notes TEXT;
