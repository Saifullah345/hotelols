-- ============================================================
-- HotelOS — Complete Supabase SQL Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PLANS TABLE
-- ============================================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  max_rooms INTEGER NOT NULL DEFAULT 20, -- -1 = unlimited
  max_staff INTEGER NOT NULL DEFAULT 5,  -- -1 = unlimited
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 29.00,
  price_yearly  NUMERIC(10,2) NOT NULL DEFAULT 290.00,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name)
);

-- Seed default plans
INSERT INTO plans (name, max_rooms, max_staff, price_monthly, price_yearly, features) VALUES
  ('basic',      20,  5,   29.00,  290.00, '["Room management","Basic booking","Email support"]'),
  ('pro',        -1,  30,  79.00,  790.00, '["Unlimited rooms","Staff management","Analytics","Stripe payments","Reviews"]'),
  ('enterprise', -1,  -1, 199.00, 1990.00, '["All Pro features","Priority support","Custom reports","Multi-property","API access"]');


-- ============================================================
-- 2. PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('super_admin', 'hotel_admin', 'staff', 'customer')),
  tenant_id UUID,  -- references hotels.id (set after hotel created)
  avatar_url TEXT,
  phone TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 3. HOTELS TABLE
-- ============================================================
CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  images JSONB NOT NULL DEFAULT '[]',
  cover_image TEXT,
  rating NUMERIC(3,1) NOT NULL DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER NOT NULL DEFAULT 0,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('active', 'suspended', 'pending')),
  check_in_time TIME NOT NULL DEFAULT '14:00',
  check_out_time TIME NOT NULL DEFAULT '11:00',
  amenities JSONB NOT NULL DEFAULT '[]',
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER hotels_updated_at
  BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_owner ON hotels(owner_id);


-- ============================================================
-- 4. ROOM TYPES TABLE
-- ============================================================
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,   -- e.g. 'Standard', 'Deluxe', 'Suite', 'Presidential'
  description TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 2,
  amenities JSONB NOT NULL DEFAULT '[]',
  images JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_types_hotel ON room_types(hotel_id);


-- ============================================================
-- 5. ROOMS TABLE
-- ============================================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id),
  room_number TEXT NOT NULL,
  floor INTEGER NOT NULL DEFAULT 1,
  price_per_night NUMERIC(10,2) NOT NULL CHECK (price_per_night > 0),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'booked', 'maintenance', 'cleaning')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hotel_id, room_number)
);

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_rooms_hotel ON rooms(hotel_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);


-- ============================================================
-- 6. BOOKINGS TABLE
-- ============================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  room_id UUID NOT NULL REFERENCES rooms(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1 CHECK (guests > 0),
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  special_requests TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (check_out > check_in)
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_bookings_hotel ON bookings(hotel_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_checkin ON bookings(check_in);

-- Prevent double-booking
CREATE OR REPLACE FUNCTION check_room_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE room_id = NEW.room_id
      AND id != NEW.id
      AND status IN ('confirmed', 'checked_in')
      AND check_in < NEW.check_out
      AND check_out > NEW.check_in
  ) THEN
    RAISE EXCEPTION 'Room is already booked for these dates';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_double_booking
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_room_availability();


-- ============================================================
-- 7. PAYMENTS TABLE
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT NOT NULL DEFAULT 'online'
    CHECK (payment_method IN ('online', 'offline')),
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  invoice_number TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_hotel ON payments(hotel_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_invoice
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();


-- ============================================================
-- 8. STAFF TABLE
-- ============================================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department TEXT NOT NULL DEFAULT 'front_desk',
  position TEXT NOT NULL DEFAULT 'Staff',
  permissions JSONB NOT NULL DEFAULT '["bookings:read","bookings:write","rooms:read"]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hotel_id, user_id)
);

CREATE TRIGGER staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_staff_hotel ON staff(hotel_id);
CREATE INDEX idx_staff_user ON staff(user_id);

-- Enforce staff limit based on plan
CREATE OR REPLACE FUNCTION check_staff_limit()
RETURNS TRIGGER AS $$
DECLARE
  plan_max_staff INTEGER;
  current_count INTEGER;
BEGIN
  SELECT p.max_staff INTO plan_max_staff
  FROM hotels h JOIN plans p ON h.plan_id = p.id
  WHERE h.id = NEW.hotel_id;

  IF plan_max_staff = -1 THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO current_count FROM staff
  WHERE hotel_id = NEW.hotel_id AND is_active = true AND id != NEW.id;

  IF current_count >= plan_max_staff THEN
    RAISE EXCEPTION 'Staff limit reached. Upgrade your plan.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_staff_limit
  BEFORE INSERT ON staff
  FOR EACH ROW EXECUTE FUNCTION check_staff_limit();


-- ============================================================
-- 9. REVIEWS TABLE
-- ============================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id)  -- one review per booking
);

CREATE INDEX idx_reviews_hotel ON reviews(hotel_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- Auto-update hotel rating
CREATE OR REPLACE FUNCTION update_hotel_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hotels SET
    rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE hotel_id = NEW.hotel_id AND is_published = true),
    review_count = (SELECT COUNT(*) FROM reviews WHERE hotel_id = NEW.hotel_id AND is_published = true)
  WHERE id = NEW.hotel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_update_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_hotel_rating();


-- ============================================================
-- 10. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system'
    CHECK (type IN ('booking', 'payment', 'system', 'staff')),
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);


-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get current user tenant
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ---------- PLANS ----------
CREATE POLICY "plans_public_read" ON plans FOR SELECT USING (true);
CREATE POLICY "plans_super_admin_write" ON plans FOR ALL
  USING (current_user_role() = 'super_admin');

-- ---------- PROFILES ----------
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_own_read" ON profiles FOR SELECT
  USING (id = auth.uid() OR current_user_role() IN ('super_admin', 'hotel_admin'));

CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_super_admin" ON profiles FOR ALL
  USING (current_user_role() = 'super_admin');

CREATE POLICY "profiles_hotel_admin_read" ON profiles FOR SELECT
  USING (
    current_user_role() = 'hotel_admin'
    AND tenant_id = current_tenant_id()
  );

-- ---------- HOTELS ----------
CREATE POLICY "hotels_public_read_active" ON hotels FOR SELECT
  USING (status = 'active' OR current_user_role() IN ('super_admin', 'hotel_admin'));

CREATE POLICY "hotels_super_admin_all" ON hotels FOR ALL
  USING (current_user_role() = 'super_admin');

CREATE POLICY "hotels_admin_own" ON hotels FOR UPDATE
  USING (owner_id = auth.uid() OR id = current_tenant_id());

-- ---------- ROOM TYPES ----------
CREATE POLICY "room_types_public_read" ON room_types FOR SELECT
  USING (true);

CREATE POLICY "room_types_hotel_write" ON room_types FOR ALL
  USING (
    current_user_role() IN ('super_admin', 'hotel_admin')
    AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id())
  );

-- ---------- ROOMS ----------
CREATE POLICY "rooms_public_read" ON rooms FOR SELECT
  USING (true);

CREATE POLICY "rooms_tenant_write" ON rooms FOR INSERT
  USING (
    current_user_role() IN ('super_admin', 'hotel_admin', 'staff')
    AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id())
  );

CREATE POLICY "rooms_tenant_update" ON rooms FOR UPDATE
  USING (
    current_user_role() IN ('super_admin', 'hotel_admin', 'staff')
    AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id())
  );

CREATE POLICY "rooms_tenant_delete" ON rooms FOR DELETE
  USING (
    current_user_role() IN ('super_admin', 'hotel_admin')
    AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id())
  );

-- ---------- BOOKINGS ----------
CREATE POLICY "bookings_own_customer" ON bookings FOR SELECT
  USING (user_id = auth.uid() OR (
    current_user_role() IN ('super_admin', 'hotel_admin', 'staff')
    AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id())
  ));

CREATE POLICY "bookings_create_customer" ON bookings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "bookings_update_staff" ON bookings FOR UPDATE
  USING (
    current_user_role() IN ('super_admin', 'hotel_admin', 'staff')
    AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id())
  );

-- ---------- PAYMENTS ----------
CREATE POLICY "payments_own" ON payments FOR SELECT
  USING (
    user_id = auth.uid()
    OR (current_user_role() IN ('super_admin', 'hotel_admin')
        AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id()))
  );

CREATE POLICY "payments_create" ON payments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_update_admin" ON payments FOR UPDATE
  USING (
    current_user_role() IN ('super_admin', 'hotel_admin')
    AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id())
  );

-- ---------- STAFF ----------
CREATE POLICY "staff_hotel_read" ON staff FOR SELECT
  USING (
    user_id = auth.uid()
    OR current_user_role() IN ('super_admin', 'hotel_admin')
    AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id())
  );

CREATE POLICY "staff_hotel_write" ON staff FOR ALL
  USING (
    current_user_role() IN ('super_admin', 'hotel_admin')
    AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id())
  );

-- ---------- REVIEWS ----------
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT
  USING (is_published = true OR user_id = auth.uid() OR current_user_role() = 'hotel_admin');

CREATE POLICY "reviews_create_customer" ON reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_hotel_manage" ON reviews FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (current_user_role() IN ('super_admin', 'hotel_admin')
        AND (current_user_role() = 'super_admin' OR hotel_id = current_tenant_id()))
  );

-- ---------- NOTIFICATIONS ----------
CREATE POLICY "notifications_own" ON notifications FOR ALL
  USING (user_id = auth.uid());


-- ============================================================
-- ROOM LIMIT ENFORCEMENT (plan-based)
-- ============================================================
CREATE OR REPLACE FUNCTION check_room_limit()
RETURNS TRIGGER AS $$
DECLARE
  plan_max_rooms INTEGER;
  current_count INTEGER;
BEGIN
  SELECT p.max_rooms INTO plan_max_rooms
  FROM hotels h JOIN plans p ON h.plan_id = p.id
  WHERE h.id = NEW.hotel_id;

  IF plan_max_rooms = -1 THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO current_count FROM rooms WHERE hotel_id = NEW.hotel_id;

  IF current_count >= plan_max_rooms THEN
    RAISE EXCEPTION 'Room limit (%) reached for this plan. Upgrade to add more rooms.', plan_max_rooms;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_room_limit
  BEFORE INSERT ON rooms
  FOR EACH ROW EXECUTE FUNCTION check_room_limit();


-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Hotel dashboard stats view
CREATE OR REPLACE VIEW hotel_stats AS
SELECT
  h.id AS hotel_id,
  h.name,
  COUNT(DISTINCT r.id) AS total_rooms,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'available') AS available_rooms,
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'pending') AS pending_bookings,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'checked_in') AS checked_in,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS total_revenue,
  h.rating,
  h.review_count
FROM hotels h
LEFT JOIN rooms r ON r.hotel_id = h.id
LEFT JOIN bookings b ON b.hotel_id = h.id
LEFT JOIN payments p ON p.hotel_id = h.id
GROUP BY h.id, h.name, h.rating, h.review_count;

-- Super admin platform stats
CREATE OR REPLACE VIEW platform_stats AS
SELECT
  COUNT(DISTINCT h.id) AS total_hotels,
  COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'active') AS active_hotels,
  COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'customer') AS total_customers,
  COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'hotel_admin') AS total_hotel_admins,
  COUNT(DISTINCT b.id) AS total_bookings,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'completed'), 0) AS platform_revenue
FROM hotels h
CROSS JOIN profiles p
LEFT JOIN bookings b ON true
LEFT JOIN payments pay ON true;


-- ============================================================
-- SAMPLE SEED DATA (optional — for testing)
-- ============================================================

-- Note: Create a super admin via Supabase Auth first, then run:
-- UPDATE profiles SET role = 'super_admin', tenant_id = NULL WHERE email = 'admin@hotelos.com';

-- Sample hotel room types (insert after creating a hotel)
-- INSERT INTO room_types (hotel_id, name, description, capacity, amenities) VALUES
--   ('<hotel-uuid>', 'Standard Room', 'Comfortable standard room', 2, '["WiFi","TV","AC","Safe"]'),
--   ('<hotel-uuid>', 'Deluxe Room', 'Spacious deluxe room with city view', 2, '["WiFi","TV","AC","Safe","Minibar","Balcony"]'),
--   ('<hotel-uuid>', 'Suite', 'Luxurious suite with separate living area', 4, '["WiFi","TV","AC","Safe","Minibar","Balcony","Jacuzzi","Kitchen"]'),
--   ('<hotel-uuid>', 'Presidential Suite', 'Ultimate luxury experience', 6, '["WiFi","TV","AC","Safe","Minibar","Balcony","Jacuzzi","Kitchen","Butler service"]');
