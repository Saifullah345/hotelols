-- Contact form submissions from the public /contact page.
--
-- No INSERT policy on purpose. The form is unauthenticated, so there is no
-- auth.uid() to write a policy against, and granting anon INSERT would hand the
-- table to anyone holding the publishable anon key. /api/contact writes with the
-- service-role key instead, which bypasses RLS, and does the validation and rate
-- limiting before it gets here.
CREATE TABLE contact_messages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name  TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  phone      TEXT,
  topic      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The inbox is read newest-first, and the route counts recent rows per address
-- to stop one sender flooding it.
CREATE INDEX idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_email_created ON contact_messages(email, created_at DESC);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Submissions carry a name, email and phone number given in confidence, so only
-- super admins may read them. Hotel admins have no business seeing sales mail.
CREATE POLICY "contact_messages_super_admin" ON contact_messages FOR ALL
  USING (current_user_role() = 'super_admin');
