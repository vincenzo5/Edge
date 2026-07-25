CREATE TABLE IF NOT EXISTS production_error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  at_ms BIGINT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  detail TEXT,
  request_id TEXT
);

CREATE INDEX IF NOT EXISTS production_error_events_user_at_idx
  ON production_error_events (user_id, at_ms DESC);
