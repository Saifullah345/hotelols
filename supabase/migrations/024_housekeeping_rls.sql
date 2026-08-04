-- Add RLS policies for housekeeping_tasks.
-- The table was created in 018_housekeeping.sql without any policies,
-- which blocks all operations once RLS is enabled.

ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;

-- hotel_admin and staff can read tasks for their own hotel; super_admin sees all
CREATE POLICY "housekeeping_select"
  ON housekeeping_tasks FOR SELECT
  USING (
    current_user_role() = 'super_admin'
    OR (
      current_user_role() IN ('hotel_admin', 'staff')
      AND hotel_id = current_tenant_id()
    )
  );

-- hotel_admin and staff can create tasks scoped to their hotel
CREATE POLICY "housekeeping_insert"
  ON housekeeping_tasks FOR INSERT
  WITH CHECK (
    current_user_role() = 'super_admin'
    OR (
      current_user_role() IN ('hotel_admin', 'staff')
      AND hotel_id = current_tenant_id()
    )
  );

-- hotel_admin and staff can update tasks for their hotel
CREATE POLICY "housekeeping_update"
  ON housekeeping_tasks FOR UPDATE
  USING (
    current_user_role() = 'super_admin'
    OR (
      current_user_role() IN ('hotel_admin', 'staff')
      AND hotel_id = current_tenant_id()
    )
  );

-- only hotel_admin and super_admin can delete tasks
CREATE POLICY "housekeeping_delete"
  ON housekeeping_tasks FOR DELETE
  USING (
    current_user_role() = 'super_admin'
    OR (
      current_user_role() = 'hotel_admin'
      AND hotel_id = current_tenant_id()
    )
  );
