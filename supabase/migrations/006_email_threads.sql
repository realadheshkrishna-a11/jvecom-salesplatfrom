-- =============================================================================
-- Migration 006: Email Threads & Messages
-- =============================================================================

-- Email threads (conversations)
CREATE TABLE IF NOT EXISTS email_threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL,
  participants  TEXT[] NOT NULL DEFAULT '{}',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_count  INT NOT NULL DEFAULT 0,
  folder        TEXT NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox','sent','drafts','trash')),
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email messages
CREATE TABLE IF NOT EXISTS email_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_address  TEXT NOT NULL,
  from_name     TEXT NOT NULL DEFAULT '',
  to_addresses  TEXT[] NOT NULL DEFAULT '{}',
  cc_addresses  TEXT[] NOT NULL DEFAULT '{}',
  subject       TEXT NOT NULL,
  body_html     TEXT NOT NULL DEFAULT '',
  body_text     TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','draft','failed')),
  is_read       BOOLEAN NOT NULL DEFAULT false,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resend_id     TEXT,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_threads_org ON email_threads(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_folder ON email_threads(organization_id, folder);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_org ON email_messages(organization_id);

-- RLS
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_threads" ON email_threads
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_members_can_insert_threads" ON email_threads
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_members_can_update_threads" ON email_threads
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_members_can_view_messages" ON email_messages
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "org_members_can_insert_messages" ON email_messages
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_email_threads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_threads_updated_at
  BEFORE UPDATE ON email_threads
  FOR EACH ROW EXECUTE FUNCTION update_email_threads_updated_at();
