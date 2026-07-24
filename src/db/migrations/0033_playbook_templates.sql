CREATE TABLE IF NOT EXISTS playbook_templates (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  rules jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS playbook_templates_user_updated_idx
  ON playbook_templates (user_id, updated_at DESC);
