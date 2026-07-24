CREATE TABLE IF NOT EXISTS trading_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  at_ms BIGINT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  intent_id TEXT,
  order_ref TEXT,
  request_id TEXT,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS trading_audit_events_user_at_idx
  ON trading_audit_events (user_id, at_ms DESC);
