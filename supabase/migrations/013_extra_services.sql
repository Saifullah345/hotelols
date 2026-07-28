-- Add extra_services JSONB column to hotels
-- Each entry: { id, name, description, price, per }
-- per: 'flat' | 'per_night' | 'per_person'
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS extra_services JSONB NOT NULL DEFAULT '[]';
