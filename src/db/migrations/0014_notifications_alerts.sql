CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notification_events_user_created_idx
  ON notification_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notification_events_user_dedupe_idx
  ON notification_events (user_id, dedupe_key, created_at DESC);

CREATE TABLE IF NOT EXISTS alert_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  operator TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  message TEXT,
  recurrence TEXT NOT NULL DEFAULT 'once',
  status TEXT NOT NULL DEFAULT 'active',
  cooldown_ms INTEGER NOT NULL DEFAULT 30000,
  expires_at TIMESTAMPTZ,
  last_price DOUBLE PRECISION,
  last_fired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_definitions_user_status_idx
  ON alert_definitions (user_id, status);

CREATE INDEX IF NOT EXISTS alert_definitions_active_symbol_idx
  ON alert_definitions (status, symbol)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS alert_trigger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES alert_definitions(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  operator TEXT NOT NULL,
  trigger_price DOUBLE PRECISION NOT NULL,
  quote_price DOUBLE PRECISION NOT NULL,
  notification_id UUID REFERENCES notification_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_trigger_events_user_created_idx
  ON alert_trigger_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS alert_trigger_events_alert_idx
  ON alert_trigger_events (alert_id, created_at DESC);
