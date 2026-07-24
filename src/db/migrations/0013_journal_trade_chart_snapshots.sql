CREATE TABLE IF NOT EXISTS journal_trade_chart_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  trade_id uuid NOT NULL REFERENCES journal_trades(id) ON DELETE CASCADE,
  sort_index integer NOT NULL DEFAULT 0,
  label text,
  symbol text NOT NULL,
  interval text NOT NULL,
  cell_config jsonb NOT NULL,
  cell_config_original jsonb NOT NULL,
  plan_levels jsonb,
  screenshot_id uuid REFERENCES journal_trade_screenshots(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_trade_chart_snapshots_user_trade_idx
  ON journal_trade_chart_snapshots (user_id, trade_id);

CREATE UNIQUE INDEX IF NOT EXISTS journal_trade_chart_snapshots_trade_sort_unique
  ON journal_trade_chart_snapshots (trade_id, sort_index);
