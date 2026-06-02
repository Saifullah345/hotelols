-- ============================================================
-- Migration 002: WhatsApp, Phone & Walk-in Booking Support
-- Run this in Supabase SQL Editor after schema.sql
-- ============================================================

-- 1. Booking source (how the booking was made)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'online'
    CHECK (source IN ('online', 'whatsapp', 'phone', 'walk_in'));

-- 2. Guest info for non-registered guests (walk-in, phone, whatsapp)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name  TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- 3. Make user_id nullable so bookings can exist without a registered account
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;

-- 4. WhatsApp Business API fields on hotels
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS whatsapp_number           TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id  TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS whatsapp_access_token     TEXT;

-- ============================================================
-- 5. WhatsApp Conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id            UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_phone         TEXT        NOT NULL,
  guest_name          TEXT,
  wa_contact_id       TEXT        NOT NULL,  -- wa_id from Meta (phone number without +)
  booking_id          UUID        REFERENCES bookings(id),
  status              TEXT        NOT NULL DEFAULT 'open'
                                  CHECK (status IN ('open', 'resolved')),
  bot_state           TEXT        NOT NULL DEFAULT 'idle'
                                  CHECK (bot_state IN ('idle','awaiting_checkin','awaiting_checkout','awaiting_room','confirming')),
  bot_context         JSONB       NOT NULL DEFAULT '{}',
  last_message_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. WhatsApp Messages
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID        NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  hotel_id        UUID        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  direction       TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content         TEXT        NOT NULL,
  message_type    TEXT        NOT NULL DEFAULT 'text'
                              CHECK (message_type IN ('text', 'template', 'image', 'document')),
  wa_message_id   TEXT,
  status          TEXT        NOT NULL DEFAULT 'sent'
                              CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_hotel    ON whatsapp_conversations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_phone    ON whatsapp_conversations(guest_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_status   ON whatsapp_conversations(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_msg_conv      ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_bookings_source        ON bookings(hotel_id, source);

-- ============================================================
-- 8. Row-Level Security
-- ============================================================
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_see_hotel_conversations" ON whatsapp_conversations
  FOR ALL USING (
    hotel_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role IN ('hotel_admin', 'staff')
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "staff_see_hotel_messages" ON whatsapp_messages
  FOR ALL USING (
    hotel_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role IN ('hotel_admin', 'staff')
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
