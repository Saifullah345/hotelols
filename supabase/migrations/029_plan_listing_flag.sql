-- Add website listing feature flag to plans.
-- When false, the hotel is hidden from the public search/listing page.
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS feature_listing BOOLEAN NOT NULL DEFAULT TRUE;
