CREATE TABLE IF NOT EXISTS screener_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  screen_id TEXT NOT NULL,
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  notify_on TEXT NOT NULL DEFAULT 'added',
  status TEXT NOT NULL DEFAULT 'active',
  cooldown_ms INTEGER NOT NULL DEFAULT 300000,
  last_symbols JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_fired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS screener_alerts_user_screen_unique
  ON screener_alerts (user_id, screen_id);

CREATE INDEX IF NOT EXISTS screener_alerts_due_idx
  ON screener_alerts (status, next_run_at)
  WHERE status = 'active';
