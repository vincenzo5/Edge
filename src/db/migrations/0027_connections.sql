CREATE TABLE IF NOT EXISTS connections (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  id text NOT NULL,
  kind text NOT NULL,
  auth_kind text NOT NULL,
  broker text NOT NULL,
  environment text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'unknown',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS connections_user_id_idx ON connections (user_id);
