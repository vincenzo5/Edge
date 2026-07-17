-- Position snapshots for open-risk history.

CREATE TABLE IF NOT EXISTS position_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  connection_id text NOT NULL,
  captured_at timestamptz NOT NULL,
  positions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_id, connection_id, captured_at)
);

CREATE INDEX IF NOT EXISTS position_snapshots_user_captured_idx
  ON position_snapshots (user_id, captured_at DESC);
