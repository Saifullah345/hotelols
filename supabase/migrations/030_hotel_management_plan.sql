-- Create the "Hotel Management" plan.
-- This plan is for hotels that only want internal management tools —
-- no public website listing, no online booking.
INSERT INTO plans (
  name, price_monthly, price_yearly,
  max_rooms, max_staff,
  features, is_active,
  feature_listing,
  feature_online_booking,
  feature_housekeeping,
  feature_reviews,
  feature_advanced_reports,
  feature_api_access,
  feature_multi_property
) VALUES (
  'Hotel Management',
  29, 290,
  -1, -1,
  ARRAY[
    'Unlimited rooms & staff',
    'Booking & reservation management',
    'Guest records & history',
    'Payment tracking',
    'Housekeeping & room tracking',
    'Reports & analytics'
  ],
  true,
  false,   -- NOT listed on public website
  false,   -- NO online booking for customers
  true,    -- Housekeeping enabled
  false,   -- No public reviews
  true,    -- Reports enabled
  false,
  false
)
ON CONFLICT (name) DO NOTHING;
