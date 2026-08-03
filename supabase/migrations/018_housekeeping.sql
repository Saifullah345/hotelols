CREATE TABLE housekeeping_tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id     UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id      UUID REFERENCES rooms(id) ON DELETE SET NULL,
  task         TEXT NOT NULL,
  priority     TEXT NOT NULL DEFAULT 'normal'
                 CHECK (priority IN ('normal', 'high', 'urgent')),
  assignee     TEXT,
  due_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status       TEXT NOT NULL DEFAULT 'dirty'
                 CHECK (status IN ('dirty', 'in_progress', 'clean')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_housekeeping_hotel  ON housekeeping_tasks(hotel_id);
CREATE INDEX idx_housekeeping_room   ON housekeeping_tasks(room_id);
CREATE INDEX idx_housekeeping_status ON housekeeping_tasks(hotel_id, status);

CREATE TRIGGER housekeeping_updated_at
  BEFORE UPDATE ON housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
