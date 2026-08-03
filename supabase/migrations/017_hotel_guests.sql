-- Hotel-specific guest directory: stores passport, notes, VIP flag.
-- user_id is nullable to support manually-added walk-in guests.
CREATE TABLE hotel_guests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id    UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name        TEXT NOT NULL DEFAULT '',
  email       TEXT,
  phone       TEXT,
  country     TEXT,
  passport_id TEXT,
  notes       TEXT,
  is_vip      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hotel_guests_hotel ON hotel_guests(hotel_id);
CREATE INDEX idx_hotel_guests_user  ON hotel_guests(user_id);
-- One record per registered user per hotel.
CREATE UNIQUE INDEX hotel_guests_hotel_user_unique
  ON hotel_guests(hotel_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE TRIGGER hotel_guests_updated_at
  BEFORE UPDATE ON hotel_guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
