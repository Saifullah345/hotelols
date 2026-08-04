-- Add RLS policies for hotel_guests.
-- The table was created in 017_hotel_guests.sql without any policies,
-- which blocks all operations once RLS is enabled.

ALTER TABLE hotel_guests ENABLE ROW LEVEL SECURITY;

-- hotel_admin and staff can read guests for their own hotel; super_admin sees all
CREATE POLICY "hotel_guests_select"
  ON hotel_guests FOR SELECT
  USING (
    current_user_role() = 'super_admin'
    OR (
      current_user_role() IN ('hotel_admin', 'staff')
      AND hotel_id = current_tenant_id()
    )
    OR user_id = auth.uid()
  );

-- hotel_admin and staff can create guest records for their hotel
CREATE POLICY "hotel_guests_insert"
  ON hotel_guests FOR INSERT
  WITH CHECK (
    current_user_role() = 'super_admin'
    OR (
      current_user_role() IN ('hotel_admin', 'staff')
      AND hotel_id = current_tenant_id()
    )
  );

-- hotel_admin and staff can update guest records for their hotel
CREATE POLICY "hotel_guests_update"
  ON hotel_guests FOR UPDATE
  USING (
    current_user_role() = 'super_admin'
    OR (
      current_user_role() IN ('hotel_admin', 'staff')
      AND hotel_id = current_tenant_id()
    )
  );

-- only hotel_admin and super_admin can delete guest records
CREATE POLICY "hotel_guests_delete"
  ON hotel_guests FOR DELETE
  USING (
    current_user_role() = 'super_admin'
    OR (
      current_user_role() = 'hotel_admin'
      AND hotel_id = current_tenant_id()
    )
  );
