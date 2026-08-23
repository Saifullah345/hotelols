-- Hotel floors: define named floors so rooms can be assigned via dropdown
CREATE TABLE hotel_floors (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id      UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  floor_number  INTEGER     NOT NULL,
  name          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hotel_id, floor_number)
);

CREATE INDEX idx_hotel_floors_hotel ON hotel_floors(hotel_id);

-- RLS: hotel staff can manage their own floors
ALTER TABLE hotel_floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel staff manage floors"
  ON hotel_floors
  FOR ALL
  USING (
    hotel_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
