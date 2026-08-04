-- Replace old 3-tier plans (basic/pro/enterprise) with new 4-tier model.
-- Done via sequential renames to avoid UNIQUE(name) conflicts.
-- Existing hotels keep their plan_id FK — they are remapped to the closest new tier.

-- 1. basic → starter  ($29 → $19, 20 rooms → 15 rooms)
UPDATE plans SET
  name          = 'starter',
  price_monthly = 19.00,
  price_yearly  = 190.00,
  max_rooms     = 15,
  max_staff     = 5,
  features      = '["Room & booking management","Walk-in & WhatsApp bookings","Manual payment recording","Guest directory","Basic reports (revenue, occupancy)"]'
WHERE name = 'basic';

-- 2. pro → growth  ($79 → $49, unlimited → 60 rooms / 20 staff)
UPDATE plans SET
  name          = 'growth',
  price_monthly = 49.00,
  price_yearly  = 490.00,
  max_rooms     = 60,
  max_staff     = 20,
  features      = '["Everything in Starter","Public online booking page","Housekeeping module","Staff roles & permissions","Check-in / Check-out flow","Customer reviews","Advanced reports & exports","Priority email + chat support"]'
WHERE name = 'pro';

-- 3. enterprise → pro  ($199 → $89, unlimited stays unlimited)
UPDATE plans SET
  name          = 'pro',
  price_monthly = 89.00,
  price_yearly  = 890.00,
  max_rooms     = -1,
  max_staff     = -1,
  features      = '["Everything in Growth","Multi-property dashboard","Custom reports & analytics","API access","Stripe online payments","Branded invoice & receipts","Bulk booking import","Dedicated account manager"]'
WHERE name = 'enterprise';

-- 4. Insert new enterprise tier (custom pricing — use 0.01 as placeholder)
INSERT INTO plans (name, max_rooms, max_staff, price_monthly, price_yearly, features, is_active)
VALUES (
  'enterprise',
  -1,
  -1,
  0.01,
  0.01,
  '["Everything in Pro","Unlimited hotel properties","White-label option","SSO / custom auth","SLA guarantee (99.9% uptime)","On-site onboarding & training","Custom integrations on request","24/7 phone support"]',
  true
);
