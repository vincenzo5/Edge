CREATE TABLE IF NOT EXISTS journal_trade_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  trade_id uuid NOT NULL REFERENCES journal_trades(id) ON DELETE CASCADE,
  sort_index integer NOT NULL DEFAULT 0,
  caption text,
  mime_type text NOT NULL,
  byte_size integer NOT NULL,
  storage_key text NOT NULL,
  width integer,
  height integer,
  source text NOT NULL DEFAULT 'upload',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_trade_screenshots_user_trade_idx
  ON journal_trade_screenshots (user_id, trade_id);

CREATE UNIQUE INDEX IF NOT EXISTS journal_trade_screenshots_trade_sort_unique
  ON journal_trade_screenshots (trade_id, sort_index);
