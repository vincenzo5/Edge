CREATE TABLE IF NOT EXISTS copilot_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  mime_type text NOT NULL,
  byte_size integer NOT NULL,
  storage_key text NOT NULL,
  name text,
  source text NOT NULL DEFAULT 'upload',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS copilot_attachments_user_idx
  ON copilot_attachments (user_id, created_at DESC);
