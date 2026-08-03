-- Enterprise RBAC: one email can hold multiple roles across tenants
-- e.g. a customer account + hotel_admin for their own hotel

-- ─── 1. Junction table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('super_admin', 'hotel_admin', 'staff', 'customer')),
  tenant_id  UUID        REFERENCES public.hotels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique per (user, role, tenant). COALESCE is required because NULL != NULL in
-- standard unique indexes, so two 'customer' rows with tenant_id=NULL would both pass.
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_uniq
  ON public.user_roles (
    user_id,
    role,
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS user_roles_user_idx ON public.user_roles (user_id);

-- ─── 2. Row-level security ────────────────────────────────────────────────────
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_roles_read"   ON public.user_roles;
DROP POLICY IF EXISTS "service_role_all" ON public.user_roles;

-- Authenticated users can read only their own role rows (used by select-role page)
CREATE POLICY "own_roles_read"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Mutations are server-side only (service role bypasses RLS)
CREATE POLICY "service_role_all"
  ON public.user_roles FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 3. Backfill from profiles ────────────────────────────────────────────────
INSERT INTO public.user_roles (user_id, role, tenant_id, created_at)
SELECT
  id,
  role,
  CASE WHEN role IN ('hotel_admin', 'staff') THEN tenant_id ELSE NULL END,
  COALESCE(created_at, NOW())
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─── 4. Update new-user trigger ───────────────────────────────────────────────
-- Now also inserts into user_roles (with NULL tenant_id; the signup-hotel API
-- updates it once the hotel record has been created).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, v_role, NULL)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
