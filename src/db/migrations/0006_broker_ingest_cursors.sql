-- Broker ingest cursors: track last seen executions per user + connection.

CREATE TABLE IF NOT EXISTS broker_ingest_cursors (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  connection_id text NOT NULL,
  account_id text,
  last_exec_time timestamptz,
  last_seen_exec_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_ingest_at timestamptz,
  last_ingest_error text,
  last_flex_backfill_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, connection_id)
);

CREATE INDEX IF NOT EXISTS broker_ingest_cursors_user_updated_idx
  ON broker_ingest_cursors (user_id, updated_at DESC);
