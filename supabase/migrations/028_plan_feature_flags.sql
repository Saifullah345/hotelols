-- Add data-driven feature flag columns to plans so any plan (current or future)
-- can have its module permissions controlled without code changes.

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS feature_housekeeping      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feature_reviews            BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feature_online_booking     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feature_advanced_reports   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS feature_api_access         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS feature_multi_property     BOOLEAN NOT NULL DEFAULT FALSE;

-- Starter: restrict growth-tier modules
UPDATE plans SET
  feature_housekeeping     = FALSE,
  feature_reviews          = FALSE,
  feature_online_booking   = FALSE,
  feature_advanced_reports = FALSE
WHERE LOWER(name) = 'starter';

-- Pro and Enterprise: unlock advanced features
UPDATE plans SET
  feature_api_access     = TRUE,
  feature_multi_property = TRUE
WHERE LOWER(name) IN ('pro', 'enterprise');
