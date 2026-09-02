-- ============================================================================
-- Query performance: covering indexes for the hot dashboard/list reads, plus a
-- server-side revenue roll-up so the dashboard stops shipping every payment row
-- to the app just to add the amounts up.
--
-- Safe to re-run: every statement is IF NOT EXISTS / OR REPLACE.
-- ============================================================================

-- ── Bookings ────────────────────────────────────────────────────────────────
-- The bookings list is `WHERE hotel_id = ? ORDER BY created_at DESC`. The
-- existing idx_bookings_hotel can find the rows but not return them in order,
-- so Postgres sorts the whole hotel's history on every page load.
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_created
  ON bookings (hotel_id, created_at DESC);

-- ── Payments ────────────────────────────────────────────────────────────────
-- Revenue reads always filter on hotel + status and then walk by date.
-- INCLUDE(amount) makes it index-only: the heap is never touched.
CREATE INDEX IF NOT EXISTS idx_payments_hotel_status_created
  ON payments (hotel_id, status, created_at DESC)
  INCLUDE (amount);

-- Payments list ordering.
CREATE INDEX IF NOT EXISTS idx_payments_hotel_created
  ON payments (hotel_id, created_at DESC);

-- ── Rooms ───────────────────────────────────────────────────────────────────
-- Status count chips and the "available rooms" stat.
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_status
  ON rooms (hotel_id, status);

-- ── Reviews ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reviews_hotel_created
  ON reviews (hotel_id, created_at DESC);

-- ── Profiles ────────────────────────────────────────────────────────────────
-- Every hotel-admin and staff page resolves the caller's hotel through
-- profiles.tenant_idand staff/guest lists filter on it directly.
CREATE INDEX IF NOT EXISTS idx_profiles_tenant
  ON profiles (tenant_id);

-- ── user_roles ──────────────────────────────────────────────────────────────
-- The hotel-admin layout checks (user_id, role, tenant_id) on every navigation.
-- user_roles_user_idx only covers the first column.
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant_role
  ON public.user_roles (user_id, tenant_id, role);

-- ── saved_hotels ────────────────────────────────────────────────────────────
-- Already has a unique (user_id, hotel_id) constraint, which serves the lookup.


-- ============================================================================
-- Revenue roll-up
-- ----------------------------------------------------------------------------
-- Returns the all-time completed-payment total plus the last `months_back`
-- calendar months bucketed by month, in one round-trip and a few hundred bytes,
-- instead of streaming the hotel's entire payment history to the server.
--
-- SECURITY INVOKER (the default) keeps RLS in force: a caller only ever sees
-- their own hotel's rows, exactly as with a direct select.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.hotel_revenue_summary(
  p_hotel_id  UUID,
  months_back INT DEFAULT 6
)
RETURNS TABLE (
  month_start DATE,
  revenue     NUMERIC,
  total_all_time NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', NOW()) - ((months_back - 1) || ' months')::INTERVAL,
      date_trunc('month', NOW()),
      '1 month'::INTERVAL
    )::DATE AS month_start
  ),
  paid AS (
    SELECT amount, created_at
    FROM payments
    WHERE hotel_id = p_hotel_id
      AND status = 'completed'
  ),
  all_time AS (
    SELECT COALESCE(SUM(amount), 0) AS total FROM paid
  )
  SELECT
    m.month_start,
    COALESCE((
      SELECT SUM(p.amount)
      FROM paid p
      WHERE p.created_at >= m.month_start
        AND p.created_at <  (m.month_start + INTERVAL '1 month')
    ), 0) AS revenue,
    all_time.total AS total_all_time
  FROM months m
  CROSS JOIN all_time
  ORDER BY m.month_start;
$$;

GRANT EXECUTE ON FUNCTION public.hotel_revenue_summary(UUID, INT) TO authenticated;
