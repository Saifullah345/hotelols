-- Late-checkout policy fields on hotels table
-- cutoff_time: if guest checks out BEFORE this time on the overdue day → half-day charge
-- half_day_pct: percentage of the nightly rate charged for a half-day stay (e.g. 50)

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS late_checkout_cutoff_time  TIME    NOT NULL DEFAULT '14:00:00',
  ADD COLUMN IF NOT EXISTS late_checkout_half_day_pct NUMERIC(5,2) NOT NULL DEFAULT 50;
