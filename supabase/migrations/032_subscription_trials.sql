-- Trialsand the billing columns the app has been reading all along.
--
-- Two things happen here:
--
--  1. The billing columns (hotels.subscription_status, plans.tier_rank, the
--     Paddle ids …) are declared with IF NOT EXISTS. They were added by hand on
--     the live database and never written down, so a fresh environment built
--     from these files came up without them and every billing query failed.
--
--  2. Free trials become a property of the plan (plans.trial_days) rather than
--     something set by hand in Paddle. A hotel's trial is pinned to the hotel
--     (hotels.trial_ends_at) so that changing plan mid-trial continues the same
--     trial instead of starting a fresh one.

-- ── Plans: catalogue ids, ladder position, trial length ──────────────────────
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS paddle_product_id        TEXT,
  ADD COLUMN IF NOT EXISTS paddle_price_id_monthly  TEXT,
  ADD COLUMN IF NOT EXISTS paddle_price_id_yearly   TEXT,
  -- Second pair of prices, identical but with no trial on them. Created on
  -- demand for a hotel that has already used its trial, so cancelling and
  -- re-subscribing can't hand out a second free period.
  ADD COLUMN IF NOT EXISTS paddle_price_id_monthly_no_trial TEXT,
  ADD COLUMN IF NOT EXISTS paddle_price_id_yearly_no_trial  TEXT,
  ADD COLUMN IF NOT EXISTS tier_rank                INTEGER,
  -- 0 = no trial, charge immediately.
  ADD COLUMN IF NOT EXISTS trial_days               INTEGER NOT NULL DEFAULT 0;

ALTER TABLE plans
  DROP CONSTRAINT IF EXISTS plans_trial_days_sane;
ALTER TABLE plans
  ADD CONSTRAINT plans_trial_days_sane CHECK (trial_days >= 0 AND trial_days <= 365);

-- Rank by price for plans that predate the column. Custom-priced tiers (an
-- Enterprise plan carrying a 0.01 placeholder) need their rank set by hand —
-- the super-admin plan form asks for it.
UPDATE plans
   SET tier_rank = GREATEST(ROUND(price_monthly)::INTEGER, 1)
 WHERE tier_rank IS NULL;

-- ── Hotels: subscription state ───────────────────────────────────────────────
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS subscription_status      TEXT,
  ADD COLUMN IF NOT EXISTS plan_expires_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_activated_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_cycle            TEXT,
  ADD COLUMN IF NOT EXISTS paddle_customer_id       TEXT,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id   TEXT,
  -- When the current trial ends. Set once, on the first trialand carried
  -- across plan changes: switching plan on day 4 of 14 leaves 10 days, it does
  -- not restart the clock.
  ADD COLUMN IF NOT EXISTS trial_ends_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_started_at         TIMESTAMPTZ,
  -- Set the moment a trial is granted and never cleared: proof the hotel has
  -- had its one free period, whatever happens to the subscription afterwards.
  ADD COLUMN IF NOT EXISTS trial_used_at            TIMESTAMPTZ,
  -- Paddle's scheduled cancellation, so the billing page can say "cancels on
  -- the 14th" rather than making the hotel guess.
  ADD COLUMN IF NOT EXISTS subscription_cancel_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_hotels_subscription_status ON hotels(subscription_status);
CREATE INDEX IF NOT EXISTS idx_hotels_paddle_subscription ON hotels(paddle_subscription_id);

-- Hotels registered from now on start with no subscription at all and must buy
-- a plan before the dashboard opens. Hotels that predate billing keep NULL,
-- which the app reads as "legacy, leave alone" — switching billing on must not
-- lock out a hotel that has been operating for months.
--
-- To hold existing hotels to the same rule, run:
--   UPDATE hotels SET subscription_status = 'unsubscribed'
--    WHERE subscription_status IS NULL AND paddle_subscription_id IS NULL;

COMMENT ON COLUMN hotels.subscription_status IS
  'Paddle status (active/trialing/past_due/paused/canceled), or ''unsubscribed'' before the first purchase. NULL means a legacy hotel from before billing.';
COMMENT ON COLUMN hotels.trial_ends_at IS
  'End of the current free trial. Preserved across plan changes so a mid-trial switch continues the same trial.';
COMMENT ON COLUMN plans.trial_days IS
  'Free trial length in days for this plan. 0 charges immediately.';
